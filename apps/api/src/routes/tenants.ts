import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate, authorize, tenantId } from '../middleware/auth'
import bcrypt from 'bcryptjs'

export const tenantRoutes: FastifyPluginAsync = async (app) => {
  // Get current tenant info
  app.get('/', { onRequest: [authenticate] }, async (req) => {
    const tid = tenantId(req)
    const tenant = await app.prisma.tenant.findUnique({
      where: { id: tid },
      select: { id: true, name: true, slug: true, email: true, phone: true, address: true, city: true, state: true, logoUrl: true, plan: true },
    })
    return tenant
  })

  // Update tenant
  app.put('/', { onRequest: [authenticate, authorize('OWNER', 'ADMIN')] }, async (req) => {
    const schema = z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().length(2).optional(),
      zipCode: z.string().optional(),
    })

    const data = schema.parse(req.body)
    const tid = tenantId(req)

    const tenant = await app.prisma.tenant.update({ where: { id: tid }, data })
    return tenant
  })

  // List users in tenant — acessível a qualquer funcionário autenticado
  // (necessário para o diálogo de agendamento listar veterinários)
  app.get('/users', { onRequest: [authenticate] }, async (req) => {
    const tid = tenantId(req)
    const users = await app.prisma.user.findMany({
      where: { tenantId: tid },
      select: { id: true, name: true, email: true, role: true, active: true, commissionRate: true, createdAt: true },
      orderBy: { name: 'asc' },
    })
    return users
  })

  // Invite / create user
  app.post('/users', { onRequest: [authenticate, authorize('OWNER', 'ADMIN')] }, async (req, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(['ADMIN', 'VET', 'RECEPTIONIST']),
    })

    const data = schema.parse(req.body)
    const tid = tenantId(req)

    const exists = await app.prisma.user.findFirst({ where: { email: data.email, tenantId: tid } })
    if (exists) return reply.status(409).send({ error: 'Email já cadastrado' })

    // Desestrutura password antes de passar ao Prisma — o model usa passwordHash, não password
    const { password, ...rest } = data
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await app.prisma.user.create({
      data: { ...rest, passwordHash, tenantId: tid },
      select: { id: true, name: true, email: true, role: true },
    })

    return reply.status(201).send(user)
  })

  // Update user
  app.put('/users/:id', { onRequest: [authenticate, authorize('OWNER', 'ADMIN')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    const exists = await app.prisma.user.findFirst({ where: { id, tenantId: tid } })
    if (!exists) return reply.status(404).send({ error: 'Usuário não encontrado' })

    // Impede editar o próprio perfil via esta rota (evitar auto-promoção de role)
    if (id === req.user.sub) {
      return reply.status(403).send({ error: 'Use as configurações de perfil para editar seu próprio usuário' })
    }

    const schema = z.object({
      name:           z.string().min(2).optional(),
      role:           z.enum(['ADMIN', 'VET', 'RECEPTIONIST']).optional(),
      active:         z.boolean().optional(),
      commissionRate: z.number().min(0).max(100).optional(),
    })

    const data = schema.parse(req.body)
    const user = await app.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, commissionRate: true },
    })

    return user
  })

  /**
   * DELETE /api/tenant/users/:id
   * Desativa um funcionário (soft-delete — mantém histórico de consultas/agendamentos).
   * Não permite desativar o próprio usuário nem o último OWNER.
   */
  app.delete('/users/:id', { onRequest: [authenticate, authorize('OWNER', 'ADMIN')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    if (id === req.user.sub) {
      return reply.status(403).send({ error: 'Não é possível desativar sua própria conta' })
    }

    const exists = await app.prisma.user.findFirst({ where: { id, tenantId: tid } })
    if (!exists) return reply.status(404).send({ error: 'Usuário não encontrado' })

    // Garante que pelo menos 1 OWNER ativo permanece
    if (exists.role === 'OWNER') {
      const ownerCount = await app.prisma.user.count({ where: { tenantId: tid, role: 'OWNER', active: true } })
      if (ownerCount <= 1) {
        return reply.status(422).send({ error: 'A clínica precisa ter ao menos um proprietário ativo' })
      }
    }

    // Invalida todos os refresh tokens do usuário desativado
    await app.prisma.$transaction([
      app.prisma.refreshToken.deleteMany({ where: { userId: id } }),
      app.prisma.user.update({ where: { id }, data: { active: false } }),
    ])

    return { message: 'Funcionário desativado com sucesso' }
  })
}
