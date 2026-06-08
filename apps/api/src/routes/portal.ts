import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { authenticate, authorize, tenantId } from '../middleware/auth'

/** JWT do portal: { sub: ownerId, tid: tenantId, role: 'TUTOR' } */

async function authenticateTutor(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
    if ((req.user as any).role !== 'TUTOR') {
      return reply.status(403).send({ error: 'Acesso restrito ao portal do tutor' })
    }
  } catch {
    return reply.status(401).send({ error: 'Token inválido ou expirado' })
  }
}

function tutorId(req: FastifyRequest): string {
  return (req.user as any).sub as string
}

function tutorTenantId(req: FastifyRequest): string {
  return (req.user as any).tid as string
}

export const portalRoutes: FastifyPluginAsync = async (app) => {

  // ─── Auth do portal ──────────────────────────────────────────────

  /**
   * POST /api/portal/auth/login
   * Login do tutor no portal. Requer slug da clínica + email + senha.
   */
  app.post('/auth/login', async (req, reply) => {
    const schema = z.object({
      slug:     z.string().min(1),
      email:    z.string().email(),
      password: z.string(),
    })
    const { slug, email, password } = schema.parse(req.body)

    const tenant = await app.prisma.tenant.findUnique({ where: { slug } })
    if (!tenant) return reply.status(401).send({ error: 'Clínica, email ou senha incorretos' })

    const owner = await app.prisma.owner.findFirst({
      where: { tenantId: tenant.id, email, active: true, portalActive: true },
    })

    const valid = owner ? await bcrypt.compare(password, owner.portalPasswordHash ?? '') : false
    if (!owner || !valid) {
      return reply.status(401).send({ error: 'Clínica, email ou senha incorretos' })
    }

    const accessToken = app.jwt.sign(
      { sub: owner.id, tid: tenant.id, role: 'TUTOR' },
      { expiresIn: '15m' }
    )
    const refreshToken = crypto.randomBytes(40).toString('hex')

    await app.prisma.ownerRefreshToken.create({
      data: {
        ownerId:   owner.id,
        token:     refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
      },
    })

    return reply.status(200).send({
      accessToken,
      refreshToken,
      owner: {
        id:     owner.id,
        name:   owner.name,
        email:  owner.email,
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      },
    })
  })

  /**
   * POST /api/portal/auth/refresh
   */
  app.post('/auth/refresh', async (req, reply) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body)

    const stored = await app.prisma.ownerRefreshToken.findUnique({
      where: { token: refreshToken },
      include: { owner: { include: { tenant: { select: { id: true, name: true, slug: true } } } } },
    })

    if (!stored || stored.expiresAt < new Date()) {
      return reply.status(401).send({ error: 'Refresh token inválido ou expirado' })
    }
    if (!stored.owner.active || !stored.owner.portalActive) {
      return reply.status(401).send({ error: 'Conta desativada' })
    }

    await app.prisma.ownerRefreshToken.delete({ where: { token: refreshToken } })

    const newAccess  = app.jwt.sign({ sub: stored.owner.id, tid: stored.owner.tenantId, role: 'TUTOR' }, { expiresIn: '15m' })
    const newRefresh = crypto.randomBytes(40).toString('hex')

    await app.prisma.ownerRefreshToken.create({
      data: {
        ownerId:   stored.owner.id,
        token:     newRefresh,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    return { accessToken: newAccess, refreshToken: newRefresh }
  })

  /**
   * POST /api/portal/auth/logout
   */
  app.post('/auth/logout', async (req, reply) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body)
    await app.prisma.ownerRefreshToken.deleteMany({ where: { token: refreshToken } })
    return reply.status(204).send()
  })

  // ─── Endpoints do Portal (autenticados como TUTOR) ───────────────

  /**
   * GET /api/portal/me
   * Perfil do tutor logado.
   */
  app.get('/me', { onRequest: [authenticateTutor] }, async (req, reply) => {
    const oid = tutorId(req)
    const tid = tutorTenantId(req)

    const owner = await app.prisma.owner.findFirst({
      where: { id: oid, tenantId: tid },
      select: {
        id: true, name: true, email: true, phone: true, phone2: true,
        address: true, city: true, createdAt: true,
        tenant: { select: { id: true, name: true, phone: true, address: true, city: true } },
      },
    })

    if (!owner) return reply.status(404).send({ error: 'Conta não encontrada' })
    return owner
  })

  /**
   * GET /api/portal/pets
   * Pets do tutor logado.
   */
  app.get('/pets', { onRequest: [authenticateTutor] }, async (req) => {
    const oid = tutorId(req)
    const tid = tutorTenantId(req)

    return app.prisma.patient.findMany({
      where: { ownerId: oid, tenantId: tid, active: true },
      include: {
        vaccines: {
          where:   { active: true },
          orderBy: { appliedAt: 'desc' },
          take:    1,
          select:  { id: true, name: true, appliedAt: true, nextDoseAt: true },
        },
      },
      orderBy: { name: 'asc' },
    })
  })

  /**
   * GET /api/portal/pets/:id
   * Detalhe do pet com histórico completo.
   */
  app.get('/pets/:id', { onRequest: [authenticateTutor] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const oid    = tutorId(req)
    const tid    = tutorTenantId(req)

    const pet = await app.prisma.patient.findFirst({
      where: { id, ownerId: oid, tenantId: tid, active: true },
      include: {
        vaccines: {
          where:   { active: true },
          orderBy: { appliedAt: 'desc' },
        },
        consultations: {
          include: {
            vet:           { select: { id: true, name: true } },
            prescriptions: true,
            examRequests:  true,
          },
          orderBy: { date: 'desc' },
          take:    20,
        },
        weightRecords: {
          orderBy: { measuredAt: 'desc' },
          take:    50,
        },
        appointments: {
          where:   { scheduledAt: { gte: new Date() }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
          include: { vet: { select: { id: true, name: true } } },
          orderBy: { scheduledAt: 'asc' },
          take:    5,
        },
      },
    })

    if (!pet) return reply.status(404).send({ error: 'Pet não encontrado' })
    return pet
  })

  /**
   * GET /api/portal/invoices
   * Cobranças do tutor (somente pendentes e vencidas no topo).
   */
  app.get('/invoices', { onRequest: [authenticateTutor] }, async (req) => {
    const query = z.object({
      status:   z.string().optional(),
      page:     z.coerce.number().default(1),
      pageSize: z.coerce.number().min(1).max(50).default(10),
    }).parse(req.query)

    const oid  = tutorId(req)
    const tid  = tutorTenantId(req)
    const skip = (query.page - 1) * query.pageSize

    const where: any = { ownerId: oid, tenantId: tid }
    if (query.status) where.status = query.status

    const [invoices, total] = await Promise.all([
      app.prisma.invoice.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true } },
          items:   true,
        },
        skip,
        take:    query.pageSize,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      }),
      app.prisma.invoice.count({ where }),
    ])

    return { data: invoices, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) }
  })

  // ─── Agendamento Online pelo Tutor (Onda 4.3) ────────────────────

  /**
   * GET /api/portal/booking/vets
   * Lista veterinários disponíveis para agendamento.
   */
  app.get('/booking/vets', { onRequest: [authenticateTutor] }, async (req) => {
    const tid = tutorTenantId(req)

    return app.prisma.user.findMany({
      where:  { tenantId: tid, role: 'VET', active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
  })

  /**
   * GET /api/portal/booking/slots?vetId=...&date=2026-06-10
   * Retorna horários disponíveis para agendamento.
   * Horário de funcionamento: 8h–18h, slots de 30 min.
   */
  app.get('/booking/slots', { onRequest: [authenticateTutor] }, async (req) => {
    const query = z.object({
      vetId: z.string(),
      date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
    }).parse(req.query)

    const tid = tutorTenantId(req)
    // Usa Date.UTC para evitar ambiguidade de timezone do servidor
    const [y, m, d] = query.date.split('-').map(Number)
    const start = new Date(Date.UTC(y, m - 1, d, 11, 0, 0))  // 8h BRT = 11h UTC
    const end   = new Date(Date.UTC(y, m - 1, d, 21, 0, 0))  // 18h BRT = 21h UTC

    // Não permitir agendamento no passado
    if (start < new Date()) return []

    // Buscar agendamentos existentes do vet neste dia
    const existing = await app.prisma.appointment.findMany({
      where: {
        tenantId:    tid,
        vetId:       query.vetId,
        scheduledAt: { gte: start, lt: end },
        status:      { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { scheduledAt: true, duration: true },
    })

    // Gerar todos os slots de 30 min
    const allSlots: Date[] = []
    for (let t = new Date(start); t < end; t = new Date(t.getTime() + 30 * 60_000)) {
      allSlots.push(new Date(t))
    }

    // Filtrar slots ocupados
    const available = allSlots.filter(slot => {
      const slotEnd = new Date(slot.getTime() + 30 * 60_000)
      return !existing.some(appt => {
        const apptEnd = new Date(appt.scheduledAt.getTime() + (appt.duration ?? 30) * 60_000)
        return slot < apptEnd && slotEnd > appt.scheduledAt
      })
    })

    return available.map(s => ({
      time:  s.toISOString(),
      label: s.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }))
  })

  /**
   * GET /api/portal/booking/appointments
   * Próximas consultas do tutor (para o portal).
   */
  app.get('/booking/appointments', { onRequest: [authenticateTutor] }, async (req) => {
    const oid = tutorId(req)
    const tid = tutorTenantId(req)

    const patients = await app.prisma.patient.findMany({
      where:  { ownerId: oid, tenantId: tid, active: true },
      select: { id: true },
    })
    const patientIds = patients.map(p => p.id)

    return app.prisma.appointment.findMany({
      where: {
        tenantId:    tid,
        patientId:   { in: patientIds },
        scheduledAt: { gte: new Date() },
        status:      { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      include: {
        patient: { select: { id: true, name: true, species: true } },
        vet:     { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take:    20,
    })
  })

  /**
   * POST /api/portal/booking/appointments
   * Tutor agenda uma consulta online.
   */
  app.post('/booking/appointments', { onRequest: [authenticateTutor] }, async (req, reply) => {
    const schema = z.object({
      patientId:   z.string(),
      vetId:       z.string(),
      scheduledAt: z.string().datetime(),
      type:        z.enum(['CONSULTATION', 'RETURN', 'VACCINE', 'EXAM', 'GROOMING']).default('CONSULTATION'),
      notes:       z.string().optional(),
    })

    const data = schema.parse(req.body)
    const oid  = tutorId(req)
    const tid  = tutorTenantId(req)

    // Verificar que o paciente pertence ao tutor logado
    const patient = await app.prisma.patient.findFirst({
      where: { id: data.patientId, ownerId: oid, tenantId: tid, active: true },
    })
    if (!patient) return reply.status(404).send({ error: 'Pet não encontrado' })

    // Verificar que o vet existe
    const vet = await app.prisma.user.findFirst({
      where: { id: data.vetId, tenantId: tid, role: 'VET', active: true },
    })
    if (!vet) return reply.status(404).send({ error: 'Veterinário não disponível' })

    // Verificar conflito de horário (tanto do vet quanto do paciente)
    const scheduledAt = new Date(data.scheduledAt)
    const endTime     = new Date(scheduledAt.getTime() + 30 * 60_000)

    type ConflictRow = { id: string; type: string }
    const conflicts = await app.prisma.$queryRaw<ConflictRow[]>`
      SELECT id, 'vet' AS type FROM "Appointment"
      WHERE "tenantId" = ${tid}
        AND "vetId" = ${data.vetId}
        AND status NOT IN ('CANCELLED', 'NO_SHOW')
        AND "scheduledAt" < ${endTime}
        AND ("scheduledAt" + (duration * INTERVAL '1 minute')) > ${scheduledAt}
      UNION ALL
      SELECT id, 'patient' AS type FROM "Appointment"
      WHERE "tenantId"  = ${tid}
        AND "patientId" = ${data.patientId}
        AND status NOT IN ('CANCELLED', 'NO_SHOW')
        AND "scheduledAt" < ${endTime}
        AND ("scheduledAt" + (duration * INTERVAL '1 minute')) > ${scheduledAt}
      LIMIT 1
    `

    if (conflicts.length > 0) {
      return reply.status(409).send({ error: 'Horário não disponível. Escolha outro.' })
    }

    const appt = await app.prisma.appointment.create({
      data: {
        tenantId:    tid,
        patientId:   data.patientId,
        vetId:       data.vetId,
        scheduledAt,
        duration:    30,
        type:        data.type,
        notes:       data.notes,
        status:      'SCHEDULED',
      },
      include: {
        patient: { select: { id: true, name: true } },
        vet:     { select: { id: true, name: true } },
      },
    })

    return reply.status(201).send(appt)
  })

  /**
   * DELETE /api/portal/booking/appointments/:id
   * Tutor cancela um agendamento (somente SCHEDULED).
   */
  app.delete('/booking/appointments/:id', { onRequest: [authenticateTutor] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const oid    = tutorId(req)
    const tid    = tutorTenantId(req)

    const patients = await app.prisma.patient.findMany({
      where:  { ownerId: oid, tenantId: tid },
      select: { id: true },
    })

    const appt = await app.prisma.appointment.findFirst({
      where: { id, tenantId: tid, patientId: { in: patients.map(p => p.id) } },
    })
    if (!appt) return reply.status(404).send({ error: 'Agendamento não encontrado' })
    if (appt.status !== 'SCHEDULED') {
      return reply.status(422).send({ error: 'Só é possível cancelar consultas com status Agendado' })
    }

    await app.prisma.appointment.update({ where: { id }, data: { status: 'CANCELLED' } })
    return { message: 'Consulta cancelada com sucesso' }
  })

  // ─── Gerenciamento pelo staff da clínica ─────────────────────────

  /**
   * POST /api/portal/owners/:ownerId/activate
   * A clínica ativa/redefine o acesso ao portal de um tutor.
   * Requer autenticação de staff (não de tutor).
   */
  app.post<{ Params: { ownerId: string } }>(
    '/owners/:ownerId/activate',
    { onRequest: [authenticate, authorize('OWNER', 'ADMIN')] },
    async (req, reply) => {
      const { ownerId } = req.params
      const { password } = z.object({
        password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres')
          .regex(/^(?=.*[A-Z])(?=.*[0-9])/, 'Senha deve ter ao menos 1 maiúscula e 1 número'),
      }).parse(req.body)

      const tid = tenantId(req)

      const owner = await app.prisma.owner.findFirst({
        where: { id: ownerId, tenantId: tid, active: true },
      })
      if (!owner) return reply.status(404).send({ error: 'Tutor não encontrado' })
      if (!owner.email) {
        return reply.status(422).send({ error: 'Tutor precisa ter email cadastrado para acessar o portal' })
      }

      const hash = await bcrypt.hash(password, 10)
      await app.prisma.owner.update({
        where: { id: ownerId },
        data:  { portalPasswordHash: hash, portalActive: true },
      })

      return { message: `Portal ativado para ${owner.name}`, email: owner.email }
    }
  )

  /**
   * DELETE /api/portal/owners/:ownerId/access
   * Revoga o acesso ao portal de um tutor.
   */
  app.delete<{ Params: { ownerId: string } }>(
    '/owners/:ownerId/access',
    { onRequest: [authenticate, authorize('OWNER', 'ADMIN')] },
    async (req, reply) => {
      const { ownerId } = req.params
      const tid = tenantId(req)

      const owner = await app.prisma.owner.findFirst({ where: { id: ownerId, tenantId: tid } })
      if (!owner) return reply.status(404).send({ error: 'Tutor não encontrado' })

      await Promise.all([
        app.prisma.owner.update({
          where: { id: ownerId },
          data:  { portalActive: false, portalPasswordHash: null },
        }),
        // Invalida todos os refresh tokens do portal
        app.prisma.ownerRefreshToken.deleteMany({ where: { ownerId } }),
      ])

      return { message: 'Acesso ao portal revogado' }
    }
  )
}
