import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate, authorize, tenantId } from '../middleware/auth'

export const commissionRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate)

  /**
   * GET /api/commissions/summary?month=6&year=2026
   * Resumo de comissões por veterinário no período.
   * Calcula comissão a partir das invoices PAGAS das consultas de cada vet.
   */
  app.get('/summary', async (req) => {
    const query = z.object({
      year:  z.coerce.number().default(new Date().getFullYear()),
      month: z.coerce.number().min(1).max(12).optional(),
    }).parse(req.query)

    const tid   = tenantId(req)
    const start = query.month
      ? new Date(query.year, query.month - 1, 1)
      : new Date(query.year, 0, 1)
    const end   = query.month
      ? new Date(query.year, query.month, 0, 23, 59, 59, 999)
      : new Date(query.year, 11, 31, 23, 59, 59, 999)

    // Veterinários com taxa de comissão configurada
    const vets = await app.prisma.user.findMany({
      where: { tenantId: tid, role: 'VET', active: true },
      select: { id: true, name: true, commissionRate: true },
    })

    // Para cada vet, calcular receita gerada e comissão
    type InvoiceRow = { vetId: string; revenue: bigint | number; consultationCount: bigint | number }
    const rows = await app.prisma.$queryRaw<InvoiceRow[]>`
      SELECT
        c."vetId",
        SUM(i.total)::float     AS revenue,
        COUNT(DISTINCT c.id)::int AS "consultationCount"
      FROM "Consultation" c
      INNER JOIN "Invoice" i ON i."appointmentId" = c."appointmentId"
      WHERE c."tenantId" = ${tid}
        AND i.status    = 'PAID'
        AND i."paidAt" >= ${start}
        AND i."paidAt" <= ${end}
      GROUP BY c."vetId"
    `

    const revenueByVet = Object.fromEntries(
      rows.map(r => [r.vetId, { revenue: Number(r.revenue), consultationCount: Number(r.consultationCount) }])
    )

    const summary = vets.map(vet => {
      const data              = revenueByVet[vet.id] ?? { revenue: 0, consultationCount: 0 }
      const commissionRate    = vet.commissionRate ?? 0
      const commissionAmount  = data.revenue * commissionRate / 100

      return {
        vetId:             vet.id,
        vetName:           vet.name,
        commissionRate,
        revenue:           data.revenue,
        consultationCount: data.consultationCount,
        commissionAmount,
      }
    })

    return {
      period: { year: query.year, month: query.month ?? null },
      summary,
      totalRevenue:    summary.reduce((s, v) => s + v.revenue, 0),
      totalCommission: summary.reduce((s, v) => s + v.commissionAmount, 0),
    }
  })

  /**
   * GET /api/commissions/vets
   * Lista veterinários com suas taxas de comissão.
   */
  app.get('/vets', async (req) => {
    const tid = tenantId(req)

    return app.prisma.user.findMany({
      where:  { tenantId: tid, role: 'VET', active: true },
      select: { id: true, name: true, email: true, commissionRate: true },
      orderBy: { name: 'asc' },
    })
  })

  /**
   * PATCH /api/commissions/vets/:vetId
   * Define ou atualiza a taxa de comissão de um veterinário.
   */
  app.patch('/vets/:vetId', { onRequest: [authorize('OWNER', 'ADMIN')] }, async (req, reply) => {
    const { vetId }        = z.object({ vetId: z.string() }).parse(req.params)
    const { commissionRate } = z.object({
      commissionRate: z.number().min(0).max(100),
    }).parse(req.body)

    const tid = tenantId(req)
    const vet = await app.prisma.user.findFirst({
      where: { id: vetId, tenantId: tid, role: 'VET' },
    })
    if (!vet) return reply.status(404).send({ error: 'Veterinário não encontrado' })

    const updated = await app.prisma.user.update({
      where:  { id: vetId },
      data:   { commissionRate },
      select: { id: true, name: true, commissionRate: true },
    })

    return updated
  })

  /**
   * GET /api/commissions/vets/:vetId/history?year=2026
   * Histórico mensal de comissões de um vet específico.
   */
  app.get('/vets/:vetId/history', async (req, reply) => {
    const { vetId } = z.object({ vetId: z.string() }).parse(req.params)
    const { year }  = z.object({ year: z.coerce.number().default(new Date().getFullYear()) }).parse(req.query)
    const tid       = tenantId(req)

    const vet = await app.prisma.user.findFirst({
      where:  { id: vetId, tenantId: tid },
      select: { id: true, name: true, commissionRate: true },
    })
    if (!vet) return reply.status(404).send({ error: 'Veterinário não encontrado' })

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      start: new Date(year, i, 1),
      end:   new Date(year, i + 1, 0, 23, 59, 59, 999),
    }))

    const monthlyData = await Promise.all(months.map(async ({ month, start, end }) => {
      const result = await app.prisma.$queryRaw<{ revenue: number; count: number }[]>`
        SELECT
          COALESCE(SUM(i.total), 0)::float AS revenue,
          COUNT(DISTINCT c.id)::int         AS count
        FROM "Consultation" c
        INNER JOIN "Invoice" i ON i."appointmentId" = c."appointmentId"
        WHERE c."tenantId"  = ${tid}
          AND c."vetId"     = ${vetId}
          AND i.status      = 'PAID'
          AND i."paidAt"   >= ${start}
          AND i."paidAt"   <= ${end}
      `

      const revenue = Number(result[0]?.revenue ?? 0)
      return {
        month,
        revenue,
        consultations:    Number(result[0]?.count ?? 0),
        commissionAmount: revenue * (vet.commissionRate ?? 0) / 100,
      }
    }))

    return {
      vet:       { id: vet.id, name: vet.name, commissionRate: vet.commissionRate },
      year,
      monthly:   monthlyData,
      totalRevenue:    monthlyData.reduce((s, m) => s + m.revenue, 0),
      totalCommission: monthlyData.reduce((s, m) => s + m.commissionAmount, 0),
    }
  })
}
