/**
 * Testes de integração — rotas de agendamentos
 * Cobre: filtro por data (bug UTC), criação, validação
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

const mockAppointment = {
  id: 'appt-1', tenantId: TENANT_ID,
  patientId: 'patient-1', vetId: 'user-1',
  scheduledAt: new Date('2025-03-15T14:00:00.000Z'),
  duration: 30, status: 'SCHEDULED', type: 'CONSULTATION',
  notes: null, createdAt: new Date(),
}

function token() {
  return `Bearer ${app.jwt.sign({ sub: 'user-1', tid: TENANT_ID, role: 'VET' })}`
}

// ── Filtro de data (bug UTC) ───────────────────────────────────────────────

describe('GET /api/appointments — filtro de data', () => {
  it('filtra agendamentos pela data correta sem deslocamento UTC', async () => {
    prisma.appointment.findMany.mockResolvedValue([mockAppointment] as any)
    prisma.appointment.count.mockResolvedValue(1)

    const res = await app.inject({
      method: 'GET', url: '/api/appointments?date=2025-03-15',
      headers: { authorization: token() },
    })

    expect(res.statusCode).toBe(200)

    // Verifica os boundaries UTC da query (bug anterior: setHours usava TZ local)
    const call = (prisma.appointment.findMany as any).mock.calls[0][0]
    const start = call.where.scheduledAt.gte as Date
    const end   = call.where.scheduledAt.lte as Date

    expect(start.toISOString()).toBe('2025-03-15T00:00:00.000Z')
    expect(end.toISOString()).toBe('2025-03-15T23:59:59.999Z')
  })

  it('retorna lista vazia quando não há agendamentos no dia', async () => {
    prisma.appointment.findMany.mockResolvedValue([])
    prisma.appointment.count.mockResolvedValue(0)

    const res = await app.inject({
      method: 'GET', url: '/api/appointments?date=2099-01-01',
      headers: { authorization: token() },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(0)
  })
})

// ── POST /api/appointments ─────────────────────────────────────────────────

describe('POST /api/appointments', () => {
  it('cria agendamento com dados válidos', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1', tenantId: TENANT_ID } as any)
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1', tenantId: TENANT_ID } as any)
    prisma.$queryRaw.mockResolvedValue([])           // sem conflito de horário
    prisma.appointment.create.mockResolvedValue(mockAppointment as any)

    const res = await app.inject({
      method: 'POST', url: '/api/appointments',
      headers: { authorization: token() },
      payload: {
        patientId: 'patient-1', vetId: 'user-1',
        scheduledAt: '2025-03-15T14:00:00.000Z',
        duration: 30, type: 'CONSULTATION',
      },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().id).toBe('appt-1')
  })

  it('retorna 400 com type inválido', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/appointments',
      headers: { authorization: token() },
      payload: {
        patientId: 'patient-1', vetId: 'user-1',
        scheduledAt: '2025-03-15T14:00:00.000Z',
        duration: 30, type: 'TIPO_INVALIDO',
      },
    })

    expect(res.statusCode).toBe(400)
  })

  it('retorna 409 quando há conflito de horário', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1', tenantId: TENANT_ID } as any)
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1', tenantId: TENANT_ID } as any)
    prisma.$queryRaw.mockResolvedValue([{ id: 'appt-existing', type: 'vet' }])

    const res = await app.inject({
      method: 'POST', url: '/api/appointments',
      headers: { authorization: token() },
      payload: {
        patientId: 'patient-1', vetId: 'user-1',
        scheduledAt: '2025-03-15T14:00:00.000Z',
        duration: 30, type: 'CONSULTATION',
      },
    })

    expect(res.statusCode).toBe(409)
    expect(res.json().error).toMatch(/conflito/i)
  })
})
