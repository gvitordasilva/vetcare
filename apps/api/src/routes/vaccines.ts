import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate, authorize, tenantId } from '../middleware/auth'

export const vaccineRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate)

  app.get('/', async (req) => {
    const query = z.object({
      patientId: z.string().optional(),
      search:    z.string().optional(),         // busca por nome da vacina ou paciente
      dueSoon:   z.coerce.boolean().optional(), // next dose within 30 days
      page:      z.coerce.number().default(1),
      pageSize:  z.coerce.number().min(1).max(100).default(20),
    }).parse(req.query)

    const tid = tenantId(req)
    const skip = (query.page - 1) * query.pageSize

    const where: any = { tenantId: tid, active: true }  // filtrar soft-deleted
    if (query.patientId) where.patientId = query.patientId
    if (query.search) {
      where.OR = [
        { name:    { contains: query.search, mode: 'insensitive' } },
        { patient: { name: { contains: query.search, mode: 'insensitive' } } },
      ]
    }
    if (query.dueSoon) {
      const soon = new Date()
      soon.setDate(soon.getDate() + 30)
      where.nextDoseAt = { lte: soon, gte: new Date() }
    }

    const [vaccines, total] = await Promise.all([
      app.prisma.vaccine.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, species: true } },
          vet: { select: { id: true, name: true } },
        },
        skip,
        take: query.pageSize,
        orderBy: { appliedAt: 'desc' },
      }),
      app.prisma.vaccine.count({ where }),
    ])

    return { data: vaccines, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) }
  })

  app.post('/', async (req, reply) => {
    const schema = z.object({
      patientId: z.string(),
      vetId: z.string(),
      name: z.string().min(1),
      manufacturer: z.string().optional(),
      lot: z.string().optional(),
      dose: z.string().min(1),
      appliedAt: z.string().datetime(),
      nextDoseAt: z.string().datetime().optional(),
      notes: z.string().optional(),
    })

    const data = schema.parse(req.body)
    const tid = tenantId(req)

    const [patient, vet] = await Promise.all([
      app.prisma.patient.findFirst({ where: { id: data.patientId, tenantId: tid } }),
      app.prisma.user.findFirst({ where: { id: data.vetId, tenantId: tid } }),
    ])

    if (!patient) return reply.status(404).send({ error: 'Paciente não encontrado' })
    if (!vet) return reply.status(404).send({ error: 'Veterinário não encontrado' })

    const vaccine = await app.prisma.vaccine.create({
      data: {
        ...data,
        tenantId: tid,
        appliedAt: new Date(data.appliedAt),
        nextDoseAt: data.nextDoseAt ? new Date(data.nextDoseAt) : undefined,
      },
      include: {
        patient: { select: { id: true, name: true } },
        vet: { select: { id: true, name: true } },
      },
    })

    return reply.status(201).send(vaccine)
  })

  /**
   * PUT /api/vaccines/:id
   * Corrige dados de um registro de vacina (ex: data ou lote incorretos).
   * Apenas OWNER e ADMIN podem editar — gera trilha auditável.
   */
  app.put('/:id', { onRequest: [authorize('OWNER', 'ADMIN')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    const exists = await app.prisma.vaccine.findFirst({ where: { id, tenantId: tid, active: true } })
    if (!exists) return reply.status(404).send({ error: 'Registro de vacina não encontrado' })

    const schema = z.object({
      name:         z.string().optional(),
      manufacturer: z.string().optional(),
      lot:          z.string().optional(),
      dose:         z.string().optional(),
      appliedAt:    z.string().datetime().optional(),
      nextDoseAt:   z.string().datetime().optional().nullable(),
      notes:        z.string().optional(),
    })

    const data = schema.parse(req.body)
    const vaccine = await app.prisma.vaccine.update({
      where: { id },
      data: {
        ...data,
        appliedAt:  data.appliedAt  ? new Date(data.appliedAt)  : undefined,
        nextDoseAt: data.nextDoseAt ? new Date(data.nextDoseAt) : data.nextDoseAt === null ? null : undefined,
      },
      include: {
        patient: { select: { id: true, name: true } },
        vet:     { select: { id: true, name: true } },
      },
    })

    return vaccine
  })

  // Soft delete: registros de vacina são dados médicos — nunca apagar permanentemente.
  // Apenas OWNER e ADMIN podem "arquivar" uma vacina (ex: lançamento incorreto).
  app.delete('/:id', { onRequest: [authorize('OWNER', 'ADMIN')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    const exists = await app.prisma.vaccine.findFirst({ where: { id, tenantId: tid, active: true } })
    if (!exists) return reply.status(404).send({ error: 'Registro de vacina não encontrado' })

    await app.prisma.vaccine.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
    })

    return { message: 'Registro de vacina arquivado' }
  })
}
