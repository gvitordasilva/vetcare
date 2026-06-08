import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate, authorize, tenantId } from '../middleware/auth'

export const appointmentRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate)

  app.get('/', async (req) => {
    const query = z.object({
      date: z.string().optional(),
      vetId: z.string().optional(),
      status: z.string().optional(),
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().min(1).max(100).default(50),
    }).parse(req.query)

    const tid = tenantId(req)
    const skip = (query.page - 1) * query.pageSize

    let dateFilter = {}
    if (query.date) {
      // Constrói o intervalo explicitamente em UTC para evitar que setHours()
      // opere no fuso local do servidor e desloque o dia (bug com UTC-3).
      // O frontend envia "yyyy-MM-dd" no fuso do usuário; appointments são
      // salvos como UTC ISO — intervalos UTC cobrem o dia corretamente para
      // qualquer horário comercial (o caso extremo são agend. após 21h BRT,
      // que caem no próximo dia UTC — irrelevante para clínicas).
      const start = new Date(`${query.date}T00:00:00.000Z`)
      const end   = new Date(`${query.date}T23:59:59.999Z`)
      dateFilter = { scheduledAt: { gte: start, lte: end } }
    }

    const where = {
      tenantId: tid,
      ...dateFilter,
      ...(query.vetId && { vetId: query.vetId }),
      ...(query.status && { status: query.status as any }),
    }

    const [appointments, total] = await Promise.all([
      app.prisma.appointment.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, species: true, photoUrl: true } },
          vet: { select: { id: true, name: true } },
        },
        skip,
        take: query.pageSize,
        orderBy: { scheduledAt: 'asc' },
      }),
      app.prisma.appointment.count({ where }),
    ])

    return { data: appointments, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) }
  })

  app.get('/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    const appt = await app.prisma.appointment.findFirst({
      where: { id, tenantId: tid },
      include: {
        patient: { include: { owner: true } },
        vet: { select: { id: true, name: true } },
        consultation: true,
        invoice: true,
      },
    })

    if (!appt) return reply.status(404).send({ error: 'Agendamento não encontrado' })
    return appt
  })

  app.post('/', async (req, reply) => {
    const schema = z.object({
      patientId: z.string(),
      vetId: z.string(),
      scheduledAt: z.string().datetime(),
      duration: z.number().int().min(15).max(240).default(30),
      type: z.enum(['CONSULTATION', 'RETURN', 'VACCINE', 'SURGERY', 'EXAM', 'GROOMING', 'EMERGENCY']),
      notes: z.string().optional(),
    })

    const data = schema.parse(req.body)
    const tid = tenantId(req)

    // Check patient and vet belong to this tenant
    const [patient, vet] = await Promise.all([
      app.prisma.patient.findFirst({ where: { id: data.patientId, tenantId: tid } }),
      app.prisma.user.findFirst({ where: { id: data.vetId, tenantId: tid } }),
    ])

    if (!patient) return reply.status(404).send({ error: 'Paciente não encontrado' })
    if (!vet) return reply.status(404).send({ error: 'Veterinário não encontrado' })

    const scheduledAt = new Date(data.scheduledAt)
    const endTime = new Date(scheduledAt.getTime() + data.duration * 60_000)

    // Verificação de conflito usando SQL nativo para calcular o fim do agendamento existente.
    // Fórmula: dois intervalos [A, B) e [C, D) se sobrepõem quando A < D AND B > C.
    // Verifica conflito tanto para o veterinário quanto para o paciente.
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
      WHERE "tenantId" = ${tid}
        AND "patientId" = ${data.patientId}
        AND status NOT IN ('CANCELLED', 'NO_SHOW')
        AND "scheduledAt" < ${endTime}
        AND ("scheduledAt" + (duration * INTERVAL '1 minute')) > ${scheduledAt}
      LIMIT 1
    `

    if (conflicts.length > 0) {
      const who = conflicts[0].type === 'vet' ? 'veterinário' : 'paciente'
      return reply.status(409).send({ error: `Conflito de horário: ${who} já possui agendamento neste período` })
    }

    const appt = await app.prisma.appointment.create({
      data: { ...data, tenantId: tid, scheduledAt },
      include: {
        patient: { select: { id: true, name: true, species: true } },
        vet: { select: { id: true, name: true } },
      },
    })

    return reply.status(201).send(appt)
  })

  app.patch('/:id/status', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const { status } = z.object({
      status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
    }).parse(req.body)

    const tid = tenantId(req)
    const exists = await app.prisma.appointment.findFirst({ where: { id, tenantId: tid } })
    if (!exists) return reply.status(404).send({ error: 'Agendamento não encontrado' })

    // Máquina de estados: impede transições inválidas
    const VALID_TRANSITIONS: Record<string, string[]> = {
      SCHEDULED:    ['CONFIRMED', 'CANCELLED', 'NO_SHOW'],
      CONFIRMED:    ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
      IN_PROGRESS:  ['COMPLETED', 'CANCELLED'],
      COMPLETED:    [],  // terminal
      CANCELLED:    [],  // terminal
      NO_SHOW:      [],  // terminal
    }

    const allowed = VALID_TRANSITIONS[exists.status] ?? []
    if (!allowed.includes(status)) {
      return reply.status(422).send({
        error: `Transição inválida: ${exists.status} → ${status}`,
        allowedTransitions: allowed,
      })
    }

    const appt = await app.prisma.appointment.update({ where: { id }, data: { status } })
    return appt
  })

  app.put('/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    const exists = await app.prisma.appointment.findFirst({ where: { id, tenantId: tid } })
    if (!exists) return reply.status(404).send({ error: 'Agendamento não encontrado' })

    const schema = z.object({
      scheduledAt: z.string().datetime().optional(),
      duration: z.number().int().optional(),
      type: z.enum(['CONSULTATION', 'RETURN', 'VACCINE', 'SURGERY', 'EXAM', 'GROOMING', 'EMERGENCY']).optional(),
      notes: z.string().optional(),
    })

    const data = schema.parse(req.body)

    // Se está reagendando, revalida conflitos para o novo horário
    if (data.scheduledAt || data.duration) {
      const newScheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : exists.scheduledAt
      const newDuration    = data.duration ?? exists.duration
      const newEnd         = new Date(newScheduledAt.getTime() + newDuration * 60_000)

      type ConflictRow = { id: string; type: string }
      const conflicts = await app.prisma.$queryRaw<ConflictRow[]>`
        SELECT id, 'vet' AS type FROM "Appointment"
        WHERE "tenantId" = ${tid}
          AND "vetId"    = ${exists.vetId}
          AND id         != ${id}
          AND status NOT IN ('CANCELLED', 'NO_SHOW')
          AND "scheduledAt" < ${newEnd}
          AND ("scheduledAt" + (duration * INTERVAL '1 minute')) > ${newScheduledAt}
        UNION ALL
        SELECT id, 'patient' AS type FROM "Appointment"
        WHERE "tenantId"  = ${tid}
          AND "patientId" = ${exists.patientId}
          AND id          != ${id}
          AND status NOT IN ('CANCELLED', 'NO_SHOW')
          AND "scheduledAt" < ${newEnd}
          AND ("scheduledAt" + (duration * INTERVAL '1 minute')) > ${newScheduledAt}
        LIMIT 1
      `
      if (conflicts.length > 0) {
        const who = conflicts[0].type === 'vet' ? 'veterinário' : 'paciente'
        return reply.status(409).send({ error: `Conflito de horário: ${who} já possui agendamento neste período` })
      }
    }

    const appt = await app.prisma.appointment.update({
      where: { id },
      data: { ...data, ...(data.scheduledAt && { scheduledAt: new Date(data.scheduledAt) }) },
    })

    return appt
  })

  // Apenas OWNER e ADMIN podem cancelar agendamentos de outros usuários
  app.delete('/:id', { onRequest: [authorize('OWNER', 'ADMIN', 'RECEPTIONIST')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    const exists = await app.prisma.appointment.findFirst({ where: { id, tenantId: tid } })
    if (!exists) return reply.status(404).send({ error: 'Agendamento não encontrado' })

    if (['COMPLETED', 'CANCELLED'].includes(exists.status)) {
      return reply.status(422).send({ error: `Não é possível cancelar um agendamento com status ${exists.status}` })
    }

    await app.prisma.appointment.update({ where: { id }, data: { status: 'CANCELLED' } })
    return { message: 'Agendamento cancelado' }
  })
}
