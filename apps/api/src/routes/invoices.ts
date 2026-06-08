import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate, authorize, tenantId } from '../middleware/auth'
import { requireActiveSubscription } from '../middleware/planGuard'

export const invoiceRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate)
  app.addHook('onRequest', requireActiveSubscription)

  app.get('/', async (req) => {
    const query = z.object({
      status: z.string().optional(),
      ownerId: z.string().optional(),
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().min(1).max(100).default(20),
    }).parse(req.query)

    const tid = tenantId(req)
    const skip = (query.page - 1) * query.pageSize

    const where = {
      tenantId: tid,
      ...(query.status && { status: query.status as any }),
      ...(query.ownerId && { ownerId: query.ownerId }),
    }

    const [invoices, total] = await Promise.all([
      app.prisma.invoice.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true } },
          patient: { select: { id: true, name: true } },
          items: true,
        },
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      app.prisma.invoice.count({ where }),
    ])

    return { data: invoices, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) }
  })

  // Apenas OWNER, ADMIN e RECEPTIONIST podem emitir cobranças
  app.post('/', { onRequest: [authorize('OWNER', 'ADMIN', 'RECEPTIONIST')] }, async (req, reply) => {
    const schema = z.object({
      ownerId: z.string().optional(),
      patientId: z.string().optional(),
      appointmentId: z.string().optional(),
      discount: z.number().min(0).default(0),
      dueDate: z.string().datetime().optional(),
      notes: z.string().optional(),
      items: z.array(z.object({
        description: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().positive(),
        productId: z.string().optional(),   // se informado, vincula ao produto e desconta estoque
      })).min(1),
    })

    const data = schema.parse(req.body)
    const tid = tenantId(req)

    // Validar produtos e estoques antes de entrar na transação
    let itemsWithProducts: Array<{ description: string; quantity: number; unitPrice: number; total: number; productId?: string }>
    try {
      itemsWithProducts = await Promise.all(
      data.items.map(async (item) => {
        if (!item.productId) return { ...item, total: item.quantity * item.unitPrice }

        const product = await app.prisma.product.findFirst({
          where: { id: item.productId, tenantId: tid, active: true },
        })
        if (!product) {
          throw { statusCode: 404, message: `Produto ${item.productId} não encontrado` }
        }
        if (product.stock < item.quantity) {
          throw {
            statusCode: 422,
            message: `Estoque insuficiente para "${product.name}": disponível ${product.stock} ${product.unit}, solicitado ${item.quantity}`,
          }
        }

        // Usar preço do produto como padrão se unitPrice não informado explicitamente
        return { ...item, total: item.quantity * item.unitPrice }
      })
    )
    } catch (err: any) {
      if (err.statusCode) return reply.status(err.statusCode).send({ error: err.message })
      throw err
    }

    const subtotalFinal = itemsWithProducts.reduce((sum, i) => sum + i.total, 0)
    const totalFinal = subtotalFinal - data.discount

    // Numeração atômica: trava o registro do tenant para garantir sequência
    // sem race condition em requisições simultâneas (evita invoices com mesmo número)
    const invoice = await app.prisma.$transaction(async (tx) => {
      // SELECT ... FOR UPDATE trava a linha do tenant até o fim da transaction
      await tx.$executeRaw`SELECT id FROM "Tenant" WHERE id = ${tid} FOR UPDATE`

      const count = await tx.invoice.count({ where: { tenantId: tid } })
      const number = String(count + 1).padStart(6, '0')

      // Decrementar estoque de cada produto vinculado
      for (const item of itemsWithProducts) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })
        }
      }

      return tx.invoice.create({
        data: {
          tenantId: tid,
          number,
          ownerId: data.ownerId,
          patientId: data.patientId,
          appointmentId: data.appointmentId,
          discount: data.discount,
          subtotal: subtotalFinal,
          total: totalFinal,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          notes: data.notes,
          items: { create: itemsWithProducts },
        },
        include: { items: { include: { product: { select: { id: true, name: true } } } }, owner: true, patient: true },
      })
    })

    return reply.status(201).send(invoice)
  })

  app.patch('/:id/pay', { onRequest: [authorize('OWNER', 'ADMIN', 'RECEPTIONIST')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const { paymentMethod } = z.object({
      paymentMethod: z.enum(['CASH', 'CREDIT', 'DEBIT', 'PIX', 'TRANSFER']),
    }).parse(req.body)

    const tid = tenantId(req)
    const exists = await app.prisma.invoice.findFirst({ where: { id, tenantId: tid } })
    if (!exists) return reply.status(404).send({ error: 'Cobrança não encontrada' })
    if (exists.status === 'PAID')      return reply.status(400).send({ error: 'Cobrança já paga' })
    if (exists.status === 'CANCELLED') return reply.status(422).send({ error: 'Não é possível pagar uma cobrança cancelada' })

    const invoice = await app.prisma.invoice.update({
      where: { id },
      data: { status: 'PAID', paymentMethod, paidAt: new Date() },
    })

    return invoice
  })

  /**
   * PATCH /api/invoices/:id/cancel
   * Cancela uma cobrança PENDING ou OVERDUE. Não cancela se já paga.
   * Devolve estoque dos produtos vinculados.
   */
  app.patch('/:id/cancel', { onRequest: [authorize('OWNER', 'ADMIN')] }, async (req, reply) => {
    const { id }    = z.object({ id: z.string() }).parse(req.params)
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body)

    const tid = tenantId(req)

    const exists = await app.prisma.invoice.findFirst({
      where:   { id, tenantId: tid },
      include: { items: { where: { productId: { not: null } } } },
    })
    if (!exists) return reply.status(404).send({ error: 'Cobrança não encontrada' })
    if (exists.status === 'PAID')      return reply.status(422).send({ error: 'Não é possível cancelar uma cobrança já paga' })
    if (exists.status === 'CANCELLED') return reply.status(400).send({ error: 'Cobrança já cancelada' })

    // Devolve estoque dos produtos vinculados
    await app.prisma.$transaction(async (tx) => {
      for (const item of exists.items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data:  { stock: { increment: item.quantity } },
          })
        }
      }
      await tx.invoice.update({
        where: { id },
        data:  { status: 'CANCELLED', notes: reason ? `[Cancelado] ${reason}` : exists.notes },
      })
    })

    return { message: 'Cobrança cancelada com sucesso' }
  })
}
