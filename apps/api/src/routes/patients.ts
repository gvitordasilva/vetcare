import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate, authorize, tenantId } from '../middleware/auth'
import { requireActiveSubscription, checkLimit } from '../middleware/planGuard'

export const patientRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate)
  app.addHook('onRequest', requireActiveSubscription)

  // ── List ──────────────────────────────────────────────────────
  app.get('/', async (req) => {
    const query = z.object({
      search: z.string().optional(),
      species: z.string().optional(),
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().min(1).max(500).default(20),
    }).parse(req.query)

    const tid = tenantId(req)
    const skip = (query.page - 1) * query.pageSize

    const where = {
      tenantId: tid,
      active: true,
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { owner: { name: { contains: query.search, mode: 'insensitive' as const } } },
        ],
      }),
      ...(query.species && { species: query.species as any }),
    }

    const [patients, total] = await Promise.all([
      app.prisma.patient.findMany({
        where,
        include: { owner: { select: { id: true, name: true, phone: true, email: true } } },
        skip,
        take: query.pageSize,
        orderBy: { name: 'asc' },
      }),
      app.prisma.patient.count({ where }),
    ])

    return {
      data: patients,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    }
  })

  // ── Get by ID ─────────────────────────────────────────────────
  app.get('/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    const patient = await app.prisma.patient.findFirst({
      where: { id, tenantId: tid, active: true },
      include: {
        owner: true,
        vaccines: {
          orderBy: { appliedAt: 'desc' },
          take: 10,
        },
        consultations: {
          orderBy: { date: 'desc' },
          take: 5,
          include: { vet: { select: { id: true, name: true } } },
        },
        appointments: {
          where: { scheduledAt: { gte: new Date() } },
          orderBy: { scheduledAt: 'asc' },
          take: 3,
          include: { vet: { select: { id: true, name: true } } },
        },
      },
    })

    if (!patient) return reply.status(404).send({ error: 'Paciente não encontrado' })
    return patient
  })

  // ── Histórico de peso ─────────────────────────────────────────
  app.get('/:id/weight-history', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    const patient = await app.prisma.patient.findFirst({ where: { id, tenantId: tid } })
    if (!patient) return reply.status(404).send({ error: 'Paciente não encontrado' })

    const records = await app.prisma.weightRecord.findMany({
      where: { tenantId: tid, patientId: id },
      include: {
        measuredBy: { select: { id: true, name: true } },
        consultation: { select: { id: true, diagnosis: true } },
      },
      orderBy: { measuredAt: 'asc' },
    })

    return records
  })

  // ── Create ────────────────────────────────────────────────────
  app.post(
    '/',
    {
      onRequest: [
        checkLimit(
          'pacientes',
          (prisma, tid) => prisma.patient.count({ where: { tenantId: tid, active: true } }),
          'maxPatients',
        ),
      ],
    },
    async (req, reply) => {
    const schema = z.object({
      ownerId: z.string(),
      name: z.string().min(1),
      species: z.enum(['DOG', 'CAT', 'BIRD', 'RABBIT', 'HAMSTER', 'REPTILE', 'OTHER']),
      breed: z.string().min(1),
      gender: z.enum(['MALE', 'FEMALE']),
      birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      weight: z.number().positive().optional(),
      castrated: z.boolean().default(false),
      allergies: z.string().optional(),
      color: z.string().optional(),
      microchip: z.string().optional(),
      notes: z.string().optional(),
    })

    const data = schema.parse(req.body)
    const tid = tenantId(req)

    const ownerBelongs = await app.prisma.owner.findFirst({
      where: { id: data.ownerId, tenantId: tid },
    })
    if (!ownerBelongs) return reply.status(404).send({ error: 'Tutor não encontrado' })

    const patient = await app.prisma.patient.create({
      data: { ...data, tenantId: tid, birthDate: data.birthDate ? new Date(data.birthDate) : undefined },
      include: { owner: true },
    })

    return reply.status(201).send(patient)
  })

  // ── Update ────────────────────────────────────────────────────
  app.put('/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    const exists = await app.prisma.patient.findFirst({ where: { id, tenantId: tid } })
    if (!exists) return reply.status(404).send({ error: 'Paciente não encontrado' })

    const schema = z.object({
      name: z.string().optional(),
      species: z.enum(['DOG', 'CAT', 'BIRD', 'RABBIT', 'HAMSTER', 'REPTILE', 'OTHER']).optional(),
      breed: z.string().optional(),
      gender: z.enum(['MALE', 'FEMALE']).optional(),
      birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      weight: z.number().positive().optional(),
      castrated: z.boolean().optional(),
      allergies: z.string().optional(),
      color: z.string().optional(),
      microchip: z.string().optional(),
      notes: z.string().optional(),
      active: z.boolean().optional(),
    })

    const data = schema.parse(req.body)

    // Se está atualizando o peso, cria registro histórico além de atualizar o cache
    const patient = await app.prisma.$transaction(async (tx) => {
      if (data.weight) {
        await tx.weightRecord.create({
          data: {
            tenantId:    tid,
            patientId:   id,
            weight:      data.weight,
            measuredAt:  new Date(),
            measuredById: req.user.sub,   // usuário que fez a edição
          },
        })
      }
      return tx.patient.update({
        where: { id },
        data: { ...data, birthDate: data.birthDate ? new Date(data.birthDate) : undefined },
        include: { owner: true },
      })
    })

    return patient
  })

  // ── Upload de foto ────────────────────────────────────────────
  app.post('/:id/photo', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    const patient = await app.prisma.patient.findFirst({ where: { id, tenantId: tid, active: true } })
    if (!patient) return reply.status(404).send({ error: 'Paciente não encontrado' })

    const data = await req.file()
    if (!data) return reply.status(400).send({ error: 'Nenhum arquivo enviado' })

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Formato não suportado. Use JPG, PNG ou WebP.' })
    }

    const buffer = await data.toBuffer()
    if (buffer.byteLength > 5 * 1024 * 1024) {
      return reply.status(400).send({ error: 'Imagem muito grande. Máximo 5 MB.' })
    }

    // Remove foto antiga se existir
    if (patient.photoUrl) {
      const oldFilename = patient.photoUrl.split('/uploads/')[1]
      if (oldFilename) await app.deleteFile(oldFilename)
    }

    const photoUrl = await app.saveFile(buffer, data.filename || `photo.${data.mimetype.split('/')[1]}`)
    const updated  = await app.prisma.patient.update({ where: { id }, data: { photoUrl } })

    return { photoUrl: updated.photoUrl }
  })

  // ── Delete (soft) — apenas OWNER e ADMIN ─────────────────────
  app.delete('/:id', { onRequest: [authorize('OWNER', 'ADMIN')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    const exists = await app.prisma.patient.findFirst({ where: { id, tenantId: tid } })
    if (!exists) return reply.status(404).send({ error: 'Paciente não encontrado' })

    await app.prisma.patient.update({ where: { id }, data: { active: false } })
    return { message: 'Paciente arquivado' }
  })
}
