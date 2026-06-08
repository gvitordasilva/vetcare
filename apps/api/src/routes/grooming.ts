import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate, authorize, tenantId } from '../middleware/auth'

export const groomingRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate)

  /**
   * GET /api/grooming/packages
   * Lista pacotes de banho/tosa ativos da clínica.
   * Filtro opcional por patientId.
   */
  app.get('/packages', async (req) => {
    const query = z.object({
      patientId: z.string().optional(),
      active:    z.coerce.boolean().default(true),
      page:      z.coerce.number().default(1),
      pageSize:  z.coerce.number().min(1).max(100).default(20),
    }).parse(req.query)

    const tid  = tenantId(req)
    const skip = (query.page - 1) * query.pageSize

    const where: any = { tenantId: tid, active: query.active }
    if (query.patientId) where.patientId = query.patientId

    const [packages, total] = await Promise.all([
      app.prisma.groomingPackage.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, species: true, breed: true } },
        },
        skip,
        take:    query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      app.prisma.groomingPackage.count({ where }),
    ])

    return { data: packages, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) }
  })

  /**
   * POST /api/grooming/packages
   * Cria um pacote de sessões para um paciente.
   */
  app.post('/packages', { onRequest: [authorize('OWNER', 'ADMIN', 'RECEPTIONIST')] }, async (req, reply) => {
    const schema = z.object({
      patientId:     z.string(),
      name:          z.string().min(1),                            // ex: "Pacote 5 Banhos"
      totalSessions: z.number().int().min(1).max(100),
      price:         z.number().positive(),
      paidAt:        z.string().datetime().optional(),             // se já pago no ato
      validUntil:    z.string().datetime().optional(),
    })

    const data = schema.parse(req.body)
    const tid  = tenantId(req)

    const patient = await app.prisma.patient.findFirst({
      where: { id: data.patientId, tenantId: tid, active: true },
    })
    if (!patient) return reply.status(404).send({ error: 'Paciente não encontrado' })

    const pkg = await app.prisma.groomingPackage.create({
      data: {
        tenantId:      tid,
        patientId:     data.patientId,
        name:          data.name,
        totalSessions: data.totalSessions,
        price:         data.price,
        paidAt:        data.paidAt     ? new Date(data.paidAt)     : undefined,
        validUntil:    data.validUntil ? new Date(data.validUntil) : undefined,
      },
      include: { patient: { select: { id: true, name: true, species: true } } },
    })

    return reply.status(201).send(pkg)
  })

  /**
   * POST /api/grooming/packages/:id/use
   * Consome uma sessão do pacote (ex: ao realizar o banho).
   * Retorna erro se não houver sessões disponíveis ou se o pacote estiver vencido.
   */
  app.post<{ Params: { id: string } }>('/packages/:id/use', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid     = tenantId(req)

    const pkg = await app.prisma.groomingPackage.findFirst({
      where: { id, tenantId: tid, active: true },
    })
    if (!pkg) return reply.status(404).send({ error: 'Pacote não encontrado' })

    if (pkg.validUntil && pkg.validUntil < new Date()) {
      return reply.status(422).send({ error: 'Pacote vencido' })
    }

    const remaining = pkg.totalSessions - pkg.usedSessions
    if (remaining <= 0) {
      return reply.status(422).send({ error: 'Pacote sem sessões disponíveis' })
    }

    const updated = await app.prisma.groomingPackage.update({
      where: { id },
      data:  {
        usedSessions: pkg.usedSessions + 1,
        // Desativa automaticamente quando esgota
        active: pkg.usedSessions + 1 < pkg.totalSessions,
      },
    })

    return {
      ...updated,
      remaining: updated.totalSessions - updated.usedSessions,
    }
  })

  /**
   * PATCH /api/grooming/packages/:id
   * Atualiza dados do pacote (validade, preço).
   */
  /**
   * DELETE /api/grooming/packages/:id
   * Cancela/arquiva um pacote. Apenas OWNER e ADMIN.
   */
  app.delete('/packages/:id', { onRequest: [authorize('OWNER', 'ADMIN')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid     = tenantId(req)

    const pkg = await app.prisma.groomingPackage.findFirst({ where: { id, tenantId: tid } })
    if (!pkg) return reply.status(404).send({ error: 'Pacote não encontrado' })

    await app.prisma.groomingPackage.update({ where: { id }, data: { active: false } })
    return { message: 'Pacote cancelado' }
  })

  app.patch('/packages/:id', { onRequest: [authorize('OWNER', 'ADMIN')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const schema  = z.object({
      name:       z.string().optional(),
      validUntil: z.string().datetime().optional(),
      paidAt:     z.string().datetime().optional(),
      active:     z.boolean().optional(),
    })

    const data = schema.parse(req.body)
    const tid  = tenantId(req)

    const pkg = await app.prisma.groomingPackage.findFirst({ where: { id, tenantId: tid } })
    if (!pkg) return reply.status(404).send({ error: 'Pacote não encontrado' })

    const updated = await app.prisma.groomingPackage.update({
      where: { id },
      data:  {
        name:       data.name,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        paidAt:     data.paidAt     ? new Date(data.paidAt)     : undefined,
        active:     data.active,
      },
    })

    return updated
  })
}
