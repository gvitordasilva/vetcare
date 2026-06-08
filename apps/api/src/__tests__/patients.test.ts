/**
 * Testes de integração — rotas de pacientes
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../test-utils/build-app'
import { createPrismaMock } from '../test-utils/mock-prisma'

const prisma = createPrismaMock()
let app: FastifyInstance

beforeAll(async () => { app = await buildApp(prisma) })
afterAll(async () => { await app.close() })

const TENANT_ID = 'tenant-abc'

const mockPatient = {
  id: 'patient-1', tenantId: TENANT_ID, name: 'Rex',
  species: 'DOG', breed: 'Labrador', gender: 'MALE',
  birthDate: new Date('2020-03-15'), weight: 25.5,
  color: 'Amarelo', microchip: null, photoUrl: null, notes: null,
  active: true, ownerId: 'owner-1', createdAt: new Date(), updatedAt: new Date(),
}

function token(tenantId = TENANT_ID, role = 'VET') {
  return `Bearer ${app.jwt.sign({ sub: 'user-1', tid: tenantId, role })}`
}

// ── GET /api/patients ──────────────────────────────────────────────────────

describe('GET /api/patients', () => {
  it('retorna lista paginada', async () => {
    prisma.patient.findMany.mockResolvedValue([mockPatient] as any)
    prisma.patient.count.mockResolvedValue(1)

    const res = await app.inject({
      method: 'GET', url: '/api/patients',
      headers: { authorization: token() },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(1)
    expect(res.json().total).toBe(1)
  })

  it('retorna 401 sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/patients' })
    expect(res.statusCode).toBe(401)
  })

  it('aceita pageSize até 500 (bug fix: antes limitava a 100)', async () => {
    prisma.patient.findMany.mockResolvedValue([])
    prisma.patient.count.mockResolvedValue(0)

    const res = await app.inject({
      method: 'GET', url: '/api/patients?pageSize=200',
      headers: { authorization: token() },
    })

    expect(res.statusCode).toBe(200)
  })
})

// ── GET /api/patients/:id ──────────────────────────────────────────────────

describe('GET /api/patients/:id', () => {
  it('retorna paciente por id', async () => {
    prisma.patient.findFirst.mockResolvedValue({
      ...mockPatient,
      owner: { id: 'owner-1', name: 'João', phone: '11999999999' },
      vaccines: [], consultations: [], appointments: [],
    } as any)

    const res = await app.inject({
      method: 'GET', url: '/api/patients/patient-1',
      headers: { authorization: token() },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Rex')
  })

  it('retorna 404 para id inexistente', async () => {
    prisma.patient.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'GET', url: '/api/patients/nao-existe',
      headers: { authorization: token() },
    })

    expect(res.statusCode).toBe(404)
  })

  it('não retorna paciente de outro tenant — isolamento multitenant', async () => {
    prisma.patient.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'GET', url: '/api/patients/patient-1',
      headers: { authorization: token('outro-tenant') },
    })

    expect(res.statusCode).toBe(404)
    // Garante que a query usou o tenantId do JWT
    expect(prisma.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'outro-tenant' }),
      })
    )
  })
})

// ── POST /api/patients ─────────────────────────────────────────────────────

describe('POST /api/patients', () => {
  const validPayload = {
    name: 'Bolinha', species: 'CAT', breed: 'SRD',
    gender: 'FEMALE', birthDate: '2022-06-15', ownerId: 'owner-1',
  }

  const mockOwner = { id: 'owner-1', tenantId: TENANT_ID, name: 'João' }

  it('cria paciente com dados válidos', async () => {
    prisma.owner.findFirst.mockResolvedValue(mockOwner as any)
    prisma.patient.create.mockResolvedValue({ ...mockPatient, name: 'Bolinha', species: 'CAT' } as any)

    const res = await app.inject({
      method: 'POST', url: '/api/patients',
      headers: { authorization: token() },
      payload: validPayload,
    })

    expect(res.statusCode).toBe(201)
  })

  it('aceita birthDate no formato YYYY-MM-DD (bug fix: antes retornava 500)', async () => {
    prisma.owner.findFirst.mockResolvedValue(mockOwner as any)
    prisma.patient.create.mockResolvedValue(mockPatient as any)

    const res = await app.inject({
      method: 'POST', url: '/api/patients',
      headers: { authorization: token() },
      payload: { ...validPayload, birthDate: '2020-03-15' },
    })

    expect(res.statusCode).toBe(201)
  })

  it('retorna 400 com birthDate em formato inválido (DD/MM/YYYY)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/patients',
      headers: { authorization: token() },
      payload: { ...validPayload, birthDate: '15/03/2020' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('retorna 400 com species inválida', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/patients',
      headers: { authorization: token() },
      payload: { ...validPayload, species: 'DRAGON' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('ignora tenantId do body — usa sempre o do JWT', async () => {
    prisma.owner.findFirst.mockResolvedValue(mockOwner as any)
    prisma.patient.create.mockResolvedValue(mockPatient as any)

    await app.inject({
      method: 'POST', url: '/api/patients',
      headers: { authorization: token(TENANT_ID) },
      payload: { ...validPayload, tenantId: 'tenant-malicioso' },
    })

    expect(prisma.patient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: TENANT_ID }),
      })
    )
  })
})

// ── DELETE /api/patients/:id ───────────────────────────────────────────────

describe('DELETE /api/patients/:id', () => {
  it('soft delete — marca como inactive (requer OWNER)', async () => {
    prisma.patient.findFirst.mockResolvedValue(mockPatient as any)
    prisma.patient.update.mockResolvedValue({ ...mockPatient, active: false } as any)

    const res = await app.inject({
      method: 'DELETE', url: '/api/patients/patient-1',
      headers: { authorization: token(TENANT_ID, 'OWNER') },
    })

    expect(res.statusCode).toBe(200)
    expect(prisma.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ active: false }),
      })
    )
  })

  it('retorna 403 para usuário sem permissão (VET não pode deletar)', async () => {
    const res = await app.inject({
      method: 'DELETE', url: '/api/patients/patient-1',
      headers: { authorization: token(TENANT_ID, 'VET') },
    })

    expect(res.statusCode).toBe(403)
  })

  it('retorna 404 para paciente de outro tenant', async () => {
    prisma.patient.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'DELETE', url: '/api/patients/patient-alheio',
      headers: { authorization: token(TENANT_ID, 'OWNER') },
    })

    expect(res.statusCode).toBe(404)
  })
})
