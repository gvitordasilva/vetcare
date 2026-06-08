/**
 * Factory que constrói o app Fastify com um PrismaClient mockado.
 * Usado nos testes de integração — não precisa de banco real.
 */
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

import { authRoutes } from '../routes/auth'
import { ownerRoutes } from '../routes/owners'
import { patientRoutes } from '../routes/patients'
import { appointmentRoutes } from '../routes/appointments'
import { vaccineRoutes } from '../routes/vaccines'
import { invoiceRoutes } from '../routes/invoices'
import { tenantRoutes } from '../routes/tenants'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

export async function buildApp(prismaMock: PrismaClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  // Injeta o mock diretamente no app (sem encapsulamento de plugin)
  app.decorate('prisma', prismaMock)

  // O setErrorHandler deve ser registrado ANTES dos plugins/rotas filho
  // para que os scopes filhos herdem o handler correto.
  app.setErrorHandler((err: any, _req, reply) => {
    // Duck-type check para ZodError: funciona mesmo com isolamento de módulo do Vitest
    const isZodError = err?.name === 'ZodError' || (Array.isArray(err?.issues) && err.issues.length > 0)
    if (isZodError) {
      const issues: any[] = err.issues ?? err.errors ?? []
      const first = issues[0] ?? {}
      const field = Array.isArray(first.path) && first.path.length > 0 ? `${first.path.join('.')}: ` : ''
      return reply.status(400).send({ error: `${field}${first.message ?? 'Validation error'}` })
    }
    reply.send(err)
  })

  await app.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { expiresIn: '15m' },
  })

  await app.register(authRoutes,        { prefix: '/api/auth' })
  await app.register(tenantRoutes,      { prefix: '/api/tenant' })
  await app.register(ownerRoutes,       { prefix: '/api/owners' })
  await app.register(patientRoutes,     { prefix: '/api/patients' })
  await app.register(appointmentRoutes, { prefix: '/api/appointments' })
  await app.register(vaccineRoutes,     { prefix: '/api/vaccines' })
  await app.register(invoiceRoutes,     { prefix: '/api/invoices' })

  app.get('/health', async () => ({ status: 'ok' }))

  await app.ready()
  return app
}
