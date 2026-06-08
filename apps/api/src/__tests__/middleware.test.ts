/**
 * Testes unitários — middleware de autenticação
 * Cobre: tenantId(), authorize(), isolamento multitenant
 */
import { describe, it, expect } from 'vitest'
import { tenantId, authorize } from '../middleware/auth'

// ── tenantId() ────────────────────────────────────────────────────────────────
// A função mais crítica do sistema: garante que queries sempre filtrem pelo tenant do JWT.
// Se retornasse o tenantId do body/params, um usuário poderia acessar dados de outro tenant.

describe('tenantId()', () => {
  it('retorna tid do JWT', () => {
    const mockReq = { user: { sub: 'user-1', tid: 'tenant-abc', role: 'VET' } } as any
    expect(tenantId(mockReq)).toBe('tenant-abc')
  })

  it('nunca usa tenantId do body da requisição', () => {
    // Mesmo que o body tenha um tenantId malicioso, a função ignora
    const mockReq = {
      user: { sub: 'user-1', tid: 'tenant-legit', role: 'VET' },
      body: { tenantId: 'tenant-malicioso' },
    } as any

    expect(tenantId(mockReq)).toBe('tenant-legit')
    expect(tenantId(mockReq)).not.toBe('tenant-malicioso')
  })
})

// ── authorize() ───────────────────────────────────────────────────────────────

describe('authorize()', () => {
  it('permite acesso para role autorizada', async () => {
    const mockReq = { user: { role: 'OWNER' } } as any
    const mockReply = { status: () => ({ send: () => {} }) } as any

    const guard = authorize('OWNER', 'ADMIN')
    await expect(guard(mockReq, mockReply)).resolves.toBeUndefined()
  })

  it('bloqueia role não autorizada com 403', async () => {
    let statusCode = 0
    const mockReply = {
      status: (code: number) => {
        statusCode = code
        return { send: () => {} }
      },
    } as any

    const mockReq = { user: { role: 'RECEPTIONIST' } } as any

    const guard = authorize('OWNER', 'ADMIN') // RECEPTIONIST não está na lista
    await guard(mockReq, mockReply)

    expect(statusCode).toBe(403)
  })
})
