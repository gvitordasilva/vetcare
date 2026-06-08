import { FastifyRequest, FastifyReply } from 'fastify'
import { UserRole } from '@vetcare/shared'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      tid?: string         // undefined for superadmin
      role: UserRole | 'SUPERADMIN'
    }
    user: {
      sub: string
      tid?: string
      role: UserRole | 'SUPERADMIN'
    }
  }
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
  } catch {
    reply.status(401).send({ error: 'Token inválido ou expirado' })
  }
}

export function authorize(...roles: UserRole[]) {
  // Deve ser usado APÓS authenticate (como segundo hook onRequest).
  // Não chama authenticate novamente para evitar dupla verificação de JWT.
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!roles.includes(req.user.role as UserRole)) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }
  }
}

// Ensures every query is scoped to the tenant from the JWT
export function tenantId(req: FastifyRequest): string {
  return req.user.tid!
}

// Guard exclusivo para superadmin
export async function authenticateSuperAdmin(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
    if (req.user.role !== 'SUPERADMIN') {
      reply.status(403).send({ error: 'Acesso restrito ao superadmin' })
    }
  } catch {
    reply.status(401).send({ error: 'Token inválido ou expirado' })
  }
}
