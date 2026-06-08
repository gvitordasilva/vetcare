import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate, authorize, tenantId } from '../middleware/auth'
import { requireActiveSubscription } from '../middleware/planGuard'

export const hospitalizationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate)
  app.addHook('onRequest', requireActiveSubscription)

  /**
   * GET /api/hospitalizations/whiteboard
   * Painel de internação: todos os animais internados no momento,
   * ordenados por severidade e tempo de internação.
   */
  app.get('/whiteboard', async (req) => {
    const tid = tenantId(req)

    const patients = await app.prisma.hospitalization.findMany({
      where: {
        tenantId: tid,
        status:   { in: ['ADMITTED', 'OBSERVATION'] },
      },
      include: {
        patient:        { select: { id: true, name: true, species: true, photoUrl: true, allergies: true } },
        responsibleVet: { select: { id: true, name: true } },
        evolutions:     {
          orderBy: { recordedAt: 'desc' },
          take:    1,
          select:  { recordedAt: true, temperature: true, heartRate: true, description: true },
        },
        prescriptions:  {
          where:   { OR: [{ endAt: null }, { endAt: { gt: new Date() } }] },  // ativas: sem fim ou fim no futuro
          select:  { id: true, medication: true, dosage: true, frequency: true, route: true },
        },
      },
      orderBy: [
        // CRITICAL → HIGH → MEDIUM → LOW
        { severity: 'desc' },
        { admittedAt: 'asc' },
      ],
    })

    return patients
  })

  /**
   * GET /api/hospitalizations
   * Listagem paginada (inclui alta / transferidos para histórico).
   */
  app.get('/', async (req) => {
    const query = z.object({
      status:   z.string().optional(),
      page:     z.coerce.number().default(1),
      pageSize: z.coerce.number().min(1).max(100).default(20),
    }).parse(req.query)

    const tid  = tenantId(req)
    const skip = (query.page - 1) * query.pageSize

    const where: any = { tenantId: tid }
    if (query.status) where.status = query.status

    const [items, total] = await Promise.all([
      app.prisma.hospitalization.findMany({
        where,
        include: {
          patient:        { select: { id: true, name: true, species: true } },
          responsibleVet: { select: { id: true, name: true } },
        },
        skip,
        take: query.pageSize,
        orderBy: { admittedAt: 'desc' },
      }),
      app.prisma.hospitalization.count({ where }),
    ])

    return { data: items, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) }
  })

  /**
   * GET /api/hospitalizations/:id
   * Detalhe completo: evoluções e prescrições com aplicações.
   */
  app.get('/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    const hosp = await app.prisma.hospitalization.findFirst({
      where: { id, tenantId: tid },
      include: {
        patient:        { include: { owner: true } },
        responsibleVet: { select: { id: true, name: true } },
        evolutions: {
          include: { vet: { select: { id: true, name: true } } },
          orderBy: { recordedAt: 'desc' },
        },
        prescriptions: {
          include: {
            applications: {
              include: { appliedBy: { select: { id: true, name: true } } },
              orderBy: { appliedAt: 'desc' },
            },
          },
        },
      },
    })

    if (!hosp) return reply.status(404).send({ error: 'Internação não encontrada' })
    return hosp
  })

  /**
   * POST /api/hospitalizations
   * Interna um paciente. Apenas VET, ADMIN e OWNER.
   */
  app.post('/', { onRequest: [authorize('OWNER', 'ADMIN', 'VET')] }, async (req, reply) => {
    const schema = z.object({
      patientId:        z.string(),
      responsibleVetId: z.string(),
      reason:           z.string().min(1),
      severity:         z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
      room:             z.string().optional(),
      notes:            z.string().optional(),
      admittedAt:       z.string().datetime().optional(),
    })

    const data = schema.parse(req.body)
    const tid  = tenantId(req)

    const [patient, vet] = await Promise.all([
      app.prisma.patient.findFirst({ where: { id: data.patientId, tenantId: tid, active: true } }),
      app.prisma.user.findFirst({ where: { id: data.responsibleVetId, tenantId: tid, active: true } }),
    ])
    if (!patient) return reply.status(404).send({ error: 'Paciente não encontrado' })
    if (!vet)     return reply.status(404).send({ error: 'Veterinário não encontrado' })

    // Impede internação dupla ativa do mesmo paciente
    const active = await app.prisma.hospitalization.findFirst({
      where: { tenantId: tid, patientId: data.patientId, status: { in: ['ADMITTED', 'OBSERVATION'] } },
    })
    if (active) return reply.status(409).send({ error: 'Paciente já possui internação ativa' })

    const hosp = await app.prisma.hospitalization.create({
      data: {
        tenantId:         tid,
        patientId:        data.patientId,
        responsibleVetId: data.responsibleVetId,
        reason:           data.reason,
        severity:         data.severity,
        room:             data.room,
        notes:            data.notes,
        admittedAt:       data.admittedAt ? new Date(data.admittedAt) : new Date(),
      },
      include: {
        patient:        { select: { id: true, name: true, species: true } },
        responsibleVet: { select: { id: true, name: true } },
      },
    })

    return reply.status(201).send(hosp)
  })

  /**
   * PATCH /api/hospitalizations/:id/status
   * Atualiza status (ADMITTED → OBSERVATION → DISCHARGED / TRANSFERRED).
   */
  app.patch('/:id/status', { onRequest: [authorize('OWNER', 'ADMIN', 'VET')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const { status, notes } = z.object({
      status: z.enum(['ADMITTED', 'OBSERVATION', 'DISCHARGED', 'TRANSFERRED']),
      notes:  z.string().optional(),
    }).parse(req.body)

    const tid  = tenantId(req)
    const hosp = await app.prisma.hospitalization.findFirst({ where: { id, tenantId: tid } })
    if (!hosp) return reply.status(404).send({ error: 'Internação não encontrada' })

    const VALID: Record<string, string[]> = {
      ADMITTED:    ['OBSERVATION', 'DISCHARGED', 'TRANSFERRED'],
      OBSERVATION: ['ADMITTED', 'DISCHARGED', 'TRANSFERRED'],
      DISCHARGED:  [],  // terminal
      TRANSFERRED: [],  // terminal
    }
    if (!VALID[hosp.status]?.includes(status)) {
      return reply.status(422).send({ error: `Transição inválida: ${hosp.status} → ${status}` })
    }

    const updated = await app.prisma.hospitalization.update({
      where: { id },
      data:  {
        status,
        notes:        notes ?? hosp.notes,
        dischargedAt: ['DISCHARGED', 'TRANSFERRED'].includes(status) ? new Date() : null,
      },
    })
    return updated
  })

  /**
   * POST /api/hospitalizations/:id/evolutions
   * Adiciona evolução clínica ao prontuário de internação.
   */
  app.post('/:id/evolutions', { onRequest: [authorize('OWNER', 'ADMIN', 'VET')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const schema  = z.object({
      // vetId não é aceito do body — usa sempre o usuário autenticado para garantir rastreabilidade
      description:    z.string().min(1),
      weight:         z.number().positive().optional(),
      temperature:    z.number().optional(),
      heartRate:      z.number().int().optional(),
      respiratoryRate: z.number().int().optional(),
      recordedAt:     z.string().datetime().optional(),
    })

    const data = schema.parse(req.body)
    const tid  = tenantId(req)
    // Usa o usuário autenticado como autor da evolução — não confia no body
    const vetId = req.user.sub

    const hosp = await app.prisma.hospitalization.findFirst({ where: { id, tenantId: tid } })
    if (!hosp)                                     return reply.status(404).send({ error: 'Internação não encontrada' })
    if (['DISCHARGED', 'TRANSFERRED'].includes(hosp.status)) {
      return reply.status(422).send({ error: 'Não é possível adicionar evolução a uma internação encerrada' })
    }

    const evolution = await app.prisma.hospitalizationEvolution.create({
      data: {
        hospitalizationId: id,
        vetId,
        description:       data.description,
        weight:            data.weight,
        temperature:       data.temperature,
        heartRate:         data.heartRate,
        respiratoryRate:   data.respiratoryRate,
        recordedAt:        data.recordedAt ? new Date(data.recordedAt) : new Date(),
      },
      include: { vet: { select: { id: true, name: true } } },
    })

    return reply.status(201).send(evolution)
  })

  /**
   * POST /api/hospitalizations/:id/prescriptions
   * Adiciona uma prescrição de medicamento durante internação.
   */
  app.post('/:id/prescriptions', { onRequest: [authorize('OWNER', 'ADMIN', 'VET')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const schema  = z.object({
      medication: z.string().min(1),
      dosage:     z.string().min(1),
      frequency:  z.string().min(1),
      route:      z.string().optional(),    // IV, IM, VO, SC
      startAt:    z.string().datetime(),
      endAt:      z.string().datetime().optional(),
      notes:      z.string().optional(),
    })

    const data = schema.parse(req.body)
    const tid  = tenantId(req)

    const hosp = await app.prisma.hospitalization.findFirst({ where: { id, tenantId: tid } })
    if (!hosp) return reply.status(404).send({ error: 'Internação não encontrada' })
    if (['DISCHARGED', 'TRANSFERRED'].includes(hosp.status)) {
      return reply.status(422).send({ error: 'Internação encerrada' })
    }

    const prescription = await app.prisma.hospitalizationPrescription.create({
      data: {
        hospitalizationId: id,
        medication:        data.medication,
        dosage:            data.dosage,
        frequency:         data.frequency,
        route:             data.route,
        startAt:           new Date(data.startAt),
        endAt:             data.endAt ? new Date(data.endAt) : undefined,
        notes:             data.notes,
      },
    })

    return reply.status(201).send(prescription)
  })

  /**
   * POST /api/hospitalizations/:id/prescriptions/:prescId/apply
   * Registra a aplicação de uma dose do medicamento.
   */
  app.post('/:id/prescriptions/:prescId/apply', async (req, reply) => {
    const { id, prescId } = z.object({ id: z.string(), prescId: z.string() }).parse(req.params)
    const { notes } = z.object({
      notes: z.string().optional(),
    }).parse(req.body)
    // Quem aplicou é sempre o usuário autenticado — não aceitar do body para evitar falsificação
    const appliedById = req.user.sub

    const tid = tenantId(req)

    const hosp = await app.prisma.hospitalization.findFirst({ where: { id, tenantId: tid } })
    if (!hosp) return reply.status(404).send({ error: 'Internação não encontrada' })

    const presc = await app.prisma.hospitalizationPrescription.findFirst({
      where: { id: prescId, hospitalizationId: id },
    })
    if (!presc) return reply.status(404).send({ error: 'Prescrição não encontrada' })

    const application = await app.prisma.prescriptionApplication.create({
      data: {
        prescriptionId: prescId,
        appliedById,
        notes,
        appliedAt: new Date(),
      },
      include: { appliedBy: { select: { id: true, name: true } } },
    })

    return reply.status(201).send(application)
  })
}
