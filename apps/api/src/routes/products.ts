import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate, tenantId } from '../middleware/auth'
import { requireActiveSubscription } from '../middleware/planGuard'

export const productRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate)
  app.addHook('onRequest', requireActiveSubscription)

  app.get('/', async (req) => {
    const query = z.object({
      search: z.string().optional(),
      category: z.string().optional(),
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().min(1).max(100).default(20),
    }).parse(req.query)

    const tid = tenantId(req)
    const skip = (query.page - 1) * query.pageSize

    const where = {
      tenantId: tid,
      active: true,
      ...(query.search && { name: { contains: query.search, mode: 'insensitive' as const } }),
      ...(query.category && { category: query.category }),
    }

    const [products, total] = await Promise.all([
      app.prisma.product.findMany({ where, skip, take: query.pageSize, orderBy: { name: 'asc' } }),
      app.prisma.product.count({ where }),
    ])

    return { data: products, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) }
  })

  app.post('/', async (req, reply) => {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().min(1),
      price: z.number().positive(),
      cost: z.number().positive().optional(),
      stock: z.number().int().min(0).default(0),
      unit: z.string().default('un'),
    })

    const data = schema.parse(req.body)
    const tid = tenantId(req)

    const product = await app.prisma.product.create({ data: { ...data, tenantId: tid } })
    return reply.status(201).send(product)
  })

  app.put('/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    const exists = await app.prisma.product.findFirst({ where: { id, tenantId: tid } })
    if (!exists) return reply.status(404).send({ error: 'Produto não encontrado' })

    const schema = z.object({
      name: z.string().optional(),
      price: z.number().positive().optional(),
      stock: z.number().int().optional(),
      active: z.boolean().optional(),
    })

    const data = schema.parse(req.body)
    const product = await app.prisma.product.update({ where: { id }, data })
    return product
  })
}
