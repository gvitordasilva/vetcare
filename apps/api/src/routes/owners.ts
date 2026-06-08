import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate, authorize, tenantId } from '../middleware/auth'
import { requireActiveSubscription } from '../middleware/planGuard'

/**
 * Valida CPF usando o algoritmo oficial de dígitos verificadores.
 * Rejeita CPFs com todos os dígitos iguais (ex: 111.111.111-11) que passariam
 * na verificação matemática mas são inválidos pelo padrão da Receita Federal.
 */
function isValidCpf(raw: string): boolean {
  const cpf = raw.replace(/\D/g, '')
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false   // todos iguais

  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += parseInt(cpf[i]) * (len + 1 - i)
    const rem = (sum * 10) % 11
    return rem === 10 ? 0 : rem
  }

  return calc(9) === parseInt(cpf[9]) && calc(10) === parseInt(cpf[10])
}

/**
 * Remove formatação, normaliza para 11 dígitos e valida.
 * String vazia é tratada como "não informado" (undefined) pelo campo opcional.
 */
const cpfSchema = z
  .string()
  .transform(v => v.replace(/\D/g, ''))
  .refine(v => v === '' || isValidCpf(v), { message: 'CPF inválido' })
  .transform(v => v === '' ? undefined : v)

export const ownerRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate)
  app.addHook('onRequest', requireActiveSubscription)

  app.get('/', async (req) => {
    const query = z.object({
      search: z.string().optional(),
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().min(1).max(500).default(20),
    }).parse(req.query)

    const tid = tenantId(req)
    const skip = (query.page - 1) * query.pageSize

    const where = {
      tenantId: tid,
      active: true,          // nunca retorna tutores arquivados na listagem padrão
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
          { phone: { contains: query.search } },
          { cpf: { contains: query.search } },
        ],
      }),
    }

    const [owners, total] = await Promise.all([
      app.prisma.owner.findMany({
        where,
        include: {
          patients: { where: { active: true }, select: { id: true, name: true, species: true } },
          _count: { select: { patients: true } },
        },
        skip,
        take: query.pageSize,
        orderBy: { name: 'asc' },
      }),
      app.prisma.owner.count({ where }),
    ])

    return { data: owners, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) }
  })

  app.get('/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    const owner = await app.prisma.owner.findFirst({
      where: { id, tenantId: tid },
      include: {
        patients: { where: { active: true }, include: { vaccines: { orderBy: { appliedAt: 'desc' }, take: 1 } } },
      },
    })

    if (!owner) return reply.status(404).send({ error: 'Tutor não encontrado' })
    return owner
  })

  app.post('/', async (req, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email().optional(),
      phone: z.string().min(10),
      phone2: z.string().optional(),
      cpf: cpfSchema.optional(),   // valida dígitos verificadores e normaliza para 11 dígitos
      address: z.string().optional(),
      city: z.string().optional(),
      notes: z.string().optional(),
    })

    const data = schema.parse(req.body)
    const tid = tenantId(req)

    if (data.cpf) {
      const exists = await app.prisma.owner.findUnique({ where: { tenantId_cpf: { tenantId: tid, cpf: data.cpf } } })
      if (exists) return reply.status(409).send({ error: 'CPF já cadastrado' })
    }

    const owner = await app.prisma.owner.create({ data: { ...data, tenantId: tid } })
    return reply.status(201).send(owner)
  })

  app.put('/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    const exists = await app.prisma.owner.findFirst({ where: { id, tenantId: tid } })
    if (!exists) return reply.status(404).send({ error: 'Tutor não encontrado' })

    const schema = z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      phone2: z.string().optional(),
      cpf: cpfSchema.optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      notes: z.string().optional(),
    })

    const data = schema.parse(req.body)

    // Se está atualizando o CPF, verificar se não conflita com outro tutor do mesmo tenant
    if (data.cpf) {
      const conflict = await app.prisma.owner.findUnique({
        where: { tenantId_cpf: { tenantId: tid, cpf: data.cpf } },
      })
      if (conflict && conflict.id !== id) {
        return reply.status(409).send({ error: 'CPF já cadastrado para outro tutor' })
      }
    }

    const owner = await app.prisma.owner.update({ where: { id }, data })
    return owner
  })

  // ── Soft delete — apenas OWNER e ADMIN ───────────────────────────
  app.delete('/:id', { onRequest: [authorize('OWNER', 'ADMIN')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    const owner = await app.prisma.owner.findFirst({
      where: { id, tenantId: tid, active: true },
      include: { _count: { select: { patients: { where: { active: true } } } } },
    })
    if (!owner) return reply.status(404).send({ error: 'Tutor não encontrado' })

    // Impede arquivar tutor com pacientes ativos para não deixar pacientes órfãos
    if (owner._count.patients > 0) {
      return reply.status(422).send({
        error: `Não é possível arquivar este tutor pois ele possui ${owner._count.patients} paciente(s) ativo(s). Archive os pacientes primeiro.`,
      })
    }

    await app.prisma.owner.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
    })

    return { message: 'Tutor arquivado com sucesso' }
  })
}
