/**
 * Testes de integração — rotas de autenticação
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { buildApp } from '../test-utils/build-app'
import { createPrismaMock, type PrismaMock } from '../test-utils/mock-prisma'

// Mock criado no nível do módulo — compartilhado por todos os describe deste arquivo
const prisma = createPrismaMock()
let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp(prisma)
})
afterAll(async () => {
  await app.close()
})

// ── Fixtures ────────────────────────────────────────────────────────────────

const mockTenant = {
  id: 'tenant-1', name: 'Clínica Teste', slug: 'clinica-teste',
  email: 'clinica@test.com', phone: '11999999999', address: 'Rua Teste, 1',
  city: 'São Paulo', state: 'SP', zipCode: '01310100', logoUrl: null,
  plan: 'FREE' as const, active: true, createdAt: new Date(), updatedAt: new Date(),
}

const mockUser = {
  id: 'user-1', tenantId: 'tenant-1', name: 'Admin Teste', email: 'admin@test.com',
  passwordHash: bcrypt.hashSync('Admin@123', 10),
  role: 'OWNER' as const, active: true, createdAt: new Date(),
}

// ── POST /api/auth/login ───────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('retorna tokens com credenciais corretas', async () => {
    prisma.tenant.findUnique.mockResolvedValue(mockTenant as any)
    prisma.user.findUnique.mockResolvedValue(mockUser as any)
    prisma.refreshToken.create.mockResolvedValue({
      id: 'rt-1', userId: 'user-1', token: 'raw-token', expiresAt: new Date(),
    })

    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { slug: 'clinica-teste', email: 'admin@test.com', password: 'Admin@123' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('accessToken')
    expect(res.json()).toHaveProperty('refreshToken')
    expect(res.json().user.email).toBe('admin@test.com')
    expect(res.json().tenant.slug).toBe('clinica-teste')
  })

  it('retorna 401 com senha errada', async () => {
    prisma.tenant.findUnique.mockResolvedValue(mockTenant as any)
    prisma.user.findUnique.mockResolvedValue(mockUser as any)

    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { slug: 'clinica-teste', email: 'admin@test.com', password: 'SenhaErrada1' },
    })

    expect(res.statusCode).toBe(401)
    expect(res.json().error).toBe('Clínica, email ou senha incorretos')
  })

  it('retorna 401 quando slug não existe — não vaza informação', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null)

    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { slug: 'nao-existe', email: 'a@b.com', password: 'Abc@123' },
    })

    expect(res.statusCode).toBe(401)
    expect(res.json().error).toBe('Clínica, email ou senha incorretos')
  })

  it('retorna 403 quando clínica está suspensa', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ ...mockTenant, active: false } as any)

    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { slug: 'clinica-teste', email: 'admin@test.com', password: 'Admin@123' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('retorna 400 com email malformado', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { slug: 'clinica-teste', email: 'nao-e-email', password: 'Admin@123' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('retorna 400 sem slug', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: 'admin@test.com', password: 'Admin@123' },
    })
    expect(res.statusCode).toBe(400)
  })
})

// ── POST /api/auth/register ────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  const validPayload = {
    clinicName: 'Nova Clínica', slug: 'nova-clinica', ownerName: 'Dono',
    email: 'dono@clinica.com', password: 'Senha@123', phone: '11999990000',
    address: 'Rua Nova, 100', city: 'São Paulo', state: 'SP', zipCode: '01310100',
  }

  it('cria clínica e retorna tokens', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null)
    prisma.tenant.create.mockResolvedValue({
      ...mockTenant, slug: 'nova-clinica',
      users: [{ ...mockUser, passwordHash: 'hashed' }],
    } as any)
    prisma.refreshToken.create.mockResolvedValue({
      id: 'rt-1', userId: 'user-1', token: 'token', expiresAt: new Date(),
    })

    const res = await app.inject({
      method: 'POST', url: '/api/auth/register', payload: validPayload,
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toHaveProperty('accessToken')
  })

  it('retorna 409 quando slug já está em uso', async () => {
    prisma.tenant.findUnique.mockResolvedValue(mockTenant as any)

    const res = await app.inject({
      method: 'POST', url: '/api/auth/register', payload: validPayload,
    })

    expect(res.statusCode).toBe(409)
  })

  it('retorna 400 com senha fraca (sem maiúscula)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/auth/register',
      payload: { ...validPayload, password: 'senha123' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('retorna 400 com slug inválido (caractere especial)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/auth/register',
      payload: { ...validPayload, slug: 'Clínica!' },
    })
    expect(res.statusCode).toBe(400)
  })
})

// ── POST /api/auth/refresh ─────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  it('retorna novos tokens com refresh token válido', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1', token: 'valid', userId: 'user-1',
      expiresAt: new Date(Date.now() + 86400000),
      user: { ...mockUser, tenantId: 'tenant-1' },
    } as any)
    prisma.refreshToken.delete.mockResolvedValue({} as any)
    prisma.refreshToken.create.mockResolvedValue({
      id: 'rt-2', userId: 'user-1', token: 'new', expiresAt: new Date(),
    })

    const res = await app.inject({
      method: 'POST', url: '/api/auth/refresh',
      payload: { refreshToken: 'valid' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('accessToken')
    expect(res.json()).toHaveProperty('refreshToken')
  })

  it('retorna 401 com token inválido', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null)

    const res = await app.inject({
      method: 'POST', url: '/api/auth/refresh',
      payload: { refreshToken: 'invalido' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('retorna 401 com token expirado', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1', token: 'exp', userId: 'user-1',
      expiresAt: new Date(Date.now() - 1000),
      user: mockUser,
    } as any)

    const res = await app.inject({
      method: 'POST', url: '/api/auth/refresh',
      payload: { refreshToken: 'exp' },
    })

    expect(res.statusCode).toBe(401)
  })
})

// ── POST /api/auth/logout ──────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('sempre retorna 200 (mesmo com token inválido)', async () => {
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 })

    const res = await app.inject({
      method: 'POST', url: '/api/auth/logout',
      payload: { refreshToken: 'qualquer' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().message).toBe('Logout realizado')
  })
})
