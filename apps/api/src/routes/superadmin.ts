import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { authenticateSuperAdmin } from '../middleware/auth'

export const superAdminRoutes: FastifyPluginAsync = async (app) => {

  // ── Login ────────────────────────────────────────────────────
  app.post('/auth/login', async (req, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string(),
    })
    const { email, password } = schema.parse(req.body)

    const sa = await app.prisma.superAdmin.findUnique({ where: { email } })
    if (!sa || !sa.active || !(await bcrypt.compare(password, sa.passwordHash))) {
      return reply.status(401).send({ error: 'Credenciais inválidas' })
    }

    const accessToken = app.jwt.sign({ sub: sa.id, role: 'SUPERADMIN' })
    const rawToken = crypto.randomBytes(40).toString('hex')
    await app.prisma.superAdminRefreshToken.create({
      data: {
        superAdminId: sa.id,
        token: rawToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    return {
      accessToken,
      refreshToken: rawToken,
      superAdmin: { id: sa.id, name: sa.name, email: sa.email },
    }
  })

  // ── Refresh ───────────────────────────────────────────────────
  app.post('/auth/refresh', async (req, reply) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body)

    const stored = await app.prisma.superAdminRefreshToken.findUnique({
      where: { token: refreshToken },
      include: { superAdmin: true },
    })
    if (!stored || stored.expiresAt < new Date()) {
      return reply.status(401).send({ error: 'Token inválido ou expirado' })
    }

    await app.prisma.superAdminRefreshToken.delete({ where: { id: stored.id } })

    const accessToken = app.jwt.sign({ sub: stored.superAdmin.id, role: 'SUPERADMIN' })
    const rawToken = crypto.randomBytes(40).toString('hex')
    await app.prisma.superAdminRefreshToken.create({
      data: {
        superAdminId: stored.superAdmin.id,
        token: rawToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    return { accessToken, refreshToken: rawToken }
  })

  // ── Listar todos os tenants ───────────────────────────────────
  app.get('/tenants', { onRequest: [authenticateSuperAdmin] }, async (req) => {
    const query = z.object({
      search: z.string().optional(),
      plan: z.string().optional(),
      active: z.coerce.boolean().optional(),
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().default(20),
    }).parse(req.query)

    const skip = (query.page - 1) * query.pageSize

    const where: any = {}
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ]
    }
    if (query.plan) where.plan = query.plan
    if (query.active !== undefined) where.active = query.active

    const [tenants, total] = await Promise.all([
      app.prisma.tenant.findMany({
        where,
        include: {
          _count: {
            select: { users: true, patients: true, appointments: true },
          },
        },
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      app.prisma.tenant.count({ where }),
    ])

    return {
      data: tenants,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    }
  })

  // ── Detalhe de um tenant ──────────────────────────────────────
  app.get('/tenants/:id', { onRequest: [authenticateSuperAdmin] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)

    const tenant = await app.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
          orderBy: { role: 'asc' },
        },
        _count: {
          select: { patients: true, appointments: true, consultations: true, invoices: true },
        },
      },
    })

    if (!tenant) return reply.status(404).send({ error: 'Clínica não encontrada' })
    return tenant
  })

  // ── Criar tenant + owner ──────────────────────────────────────
  app.post('/tenants', { onRequest: [authenticateSuperAdmin] }, async (req, reply) => {
    const schema = z.object({
      // Clínica
      clinicName: z.string().min(2),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
      clinicEmail: z.string().email(),
      phone: z.string().min(10),
      address: z.string().min(3),
      city: z.string().min(2),
      state: z.string().length(2),
      zipCode: z.string().min(8),
      plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']).default('FREE'),
      // Owner da clínica
      ownerName: z.string().min(2),
      ownerEmail: z.string().email(),
      ownerPassword: z.string().min(8),
    })

    const data = schema.parse(req.body)

    const slugExists = await app.prisma.tenant.findUnique({ where: { slug: data.slug } })
    if (slugExists) return reply.status(409).send({ error: 'Slug já em uso' })

    const emailExists = await app.prisma.tenant.findUnique({ where: { email: data.clinicEmail } })
    if (emailExists) return reply.status(409).send({ error: 'Email de clínica já cadastrado' })

    const passwordHash = await bcrypt.hash(data.ownerPassword, 12)

    const tenant = await app.prisma.tenant.create({
      data: {
        name: data.clinicName,
        slug: data.slug,
        email: data.clinicEmail,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        plan: data.plan,
        users: {
          create: {
            name: data.ownerName,
            email: data.ownerEmail,
            passwordHash,
            role: 'OWNER',
          },
        },
      },
      include: {
        users: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    return reply.status(201).send(tenant)
  })

  // ── Atualizar plano / status do tenant ────────────────────────
  app.patch('/tenants/:id', { onRequest: [authenticateSuperAdmin] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const schema = z.object({
      plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']).optional(),
      active: z.boolean().optional(),
      name: z.string().optional(),
    })

    const data = schema.parse(req.body)
    const exists = await app.prisma.tenant.findUnique({ where: { id } })
    if (!exists) return reply.status(404).send({ error: 'Clínica não encontrada' })

    const tenant = await app.prisma.tenant.update({ where: { id }, data })
    return tenant
  })

  // ── Criar admin/user dentro de um tenant ─────────────────────
  app.post('/tenants/:id/users', { onRequest: [authenticateSuperAdmin] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(['OWNER', 'ADMIN', 'VET', 'RECEPTIONIST']).default('ADMIN'),
    })

    const data = schema.parse(req.body)

    const tenant = await app.prisma.tenant.findUnique({ where: { id } })
    if (!tenant) return reply.status(404).send({ error: 'Clínica não encontrada' })

    const exists = await app.prisma.user.findFirst({ where: { email: data.email, tenantId: id } })
    if (exists) return reply.status(409).send({ error: 'Email já cadastrado nesta clínica' })

    const passwordHash = await bcrypt.hash(data.password, 12)
    const user = await app.prisma.user.create({
      data: { ...data, passwordHash, tenantId: id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    return reply.status(201).send(user)
  })

  // ── Reset de senha de um usuário ──────────────────────────────
  app.patch('/tenants/:tenantId/users/:userId/reset-password', { onRequest: [authenticateSuperAdmin] }, async (req, reply) => {
    const { tenantId, userId } = z.object({ tenantId: z.string(), userId: z.string() }).parse(req.params)
    const { password } = z.object({ password: z.string().min(8) }).parse(req.body)

    const user = await app.prisma.user.findFirst({ where: { id: userId, tenantId } })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })

    const passwordHash = await bcrypt.hash(password, 12)
    await app.prisma.user.update({ where: { id: userId }, data: { passwordHash } })

    return { message: 'Senha redefinida com sucesso' }
  })

  // ── Métricas gerais da plataforma ─────────────────────────────
  app.get('/metrics', { onRequest: [authenticateSuperAdmin] }, async () => {
    const [
      totalTenants,
      activeTenants,
      totalPatients,
      totalUsers,
      totalAppointments,
      planBreakdown,
      recentTenants,
    ] = await Promise.all([
      app.prisma.tenant.count(),
      app.prisma.tenant.count({ where: { active: true } }),
      app.prisma.patient.count(),
      app.prisma.user.count(),
      app.prisma.appointment.count(),
      app.prisma.tenant.groupBy({ by: ['plan'], _count: { _all: true } }),
      app.prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, plan: true, active: true, createdAt: true, _count: { select: { patients: true } } },
      }),
    ])

    return {
      totalTenants,
      activeTenants,
      inactiveTenants: totalTenants - activeTenants,
      totalPatients,
      totalUsers,
      totalAppointments,
      planBreakdown: planBreakdown.reduce((acc: any, p) => {
        acc[p.plan] = p._count._all
        return acc
      }, {}),
      recentTenants,
    }
  })
}
