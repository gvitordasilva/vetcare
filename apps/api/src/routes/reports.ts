import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate, tenantId } from '../middleware/auth'

export const reportsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate)

  /**
   * GET /api/reports/financial?year=2025
   * Retorna relatório financeiro anual com:
   *   - Receita mensal (últimos 12 meses ou ano específico)
   *   - Ticket médio por mês
   *   - Taxa de inadimplência
   *   - Receita por método de pagamento
   */
  app.get('/financial', async (req) => {
    const query = z.object({
      year: z.coerce.number().default(new Date().getFullYear()),
    }).parse(req.query)

    const tid = tenantId(req)
    const { year } = query

    // 12 meses do ano
    const months = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(year, i, 1)
      const end   = new Date(year, i + 1, 0, 23, 59, 59, 999)
      return { month: i + 1, start, end }
    })

    const [monthlyData, overallPaid, overallOverdue, byPaymentMethod] = await Promise.all([
      // Dados mensais: pago e vencido
      Promise.all(
        months.map(async ({ month, start, end }) => {
          const [paid, overdue, pending, created] = await Promise.all([
            app.prisma.invoice.aggregate({
              where: { tenantId: tid, status: 'PAID', paidAt: { gte: start, lte: end } },
              _sum: { total: true },
              _count: true,
            }),
            app.prisma.invoice.aggregate({
              where: { tenantId: tid, status: 'OVERDUE', createdAt: { gte: start, lte: end } },
              _sum: { total: true },
              _count: true,
            }),
            app.prisma.invoice.aggregate({
              where: { tenantId: tid, status: 'PENDING', createdAt: { gte: start, lte: end } },
              _sum: { total: true },
              _count: true,
            }),
            // Total emitido no mês (para calcular inadimplência)
            app.prisma.invoice.aggregate({
              where: { tenantId: tid, createdAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
              _sum: { total: true },
              _count: true,
            }),
          ])

          const revenue  = paid._sum.total    ?? 0
          const invoices = paid._count         ?? 0
          const overdueAmt = overdue._sum.total ?? 0
          const emitted  = created._sum.total  ?? 0

          return {
            month,
            revenue,
            invoiceCount: invoices,
            ticketMedio: invoices > 0 ? revenue / invoices : 0,
            overdue: overdueAmt,
            pending: pending._sum.total ?? 0,
            inadimplenciaRate: emitted > 0 ? (overdueAmt / emitted) * 100 : 0,
          }
        })
      ),

      // Total pago no ano
      app.prisma.invoice.aggregate({
        where: {
          tenantId: tid,
          status: 'PAID',
          paidAt: {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31, 23, 59, 59),
          },
        },
        _sum: { total: true },
        _count: true,
      }),

      // Total vencido no ano
      app.prisma.invoice.aggregate({
        where: {
          tenantId: tid,
          status: 'OVERDUE',
          createdAt: {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31, 23, 59, 59),
          },
        },
        _sum: { total: true },
      }),

      // Receita por método de pagamento no ano
      app.prisma.invoice.groupBy({
        by: ['paymentMethod'],
        where: {
          tenantId: tid,
          status: 'PAID',
          paidAt: {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31, 23, 59, 59),
          },
        },
        _sum: { total: true },
        _count: true,
      }),
    ])

    const totalRevenue = overallPaid._sum.total    ?? 0
    const totalCount   = overallPaid._count         ?? 0
    const totalOverdue = overallOverdue._sum.total  ?? 0

    return {
      year,
      summary: {
        totalRevenue,
        totalInvoices: totalCount,
        ticketMedioAnual: totalCount > 0 ? totalRevenue / totalCount : 0,
        totalOverdue,
        inadimplenciaAnual: totalRevenue > 0 ? (totalOverdue / (totalRevenue + totalOverdue)) * 100 : 0,
      },
      monthly: monthlyData,
      byPaymentMethod: byPaymentMethod.map(g => ({
        method: g.paymentMethod ?? 'Não informado',
        total:  g._sum.total ?? 0,
        count:  g._count,
      })),
    }
  })

  /**
   * GET /api/reports/services?year=2025&month=6
   * Receita por tipo de serviço (baseado no AppointmentType da invoice vinculada).
   * Invoices sem appointment vinculado aparecem como "Avulso".
   */
  app.get('/services', async (req) => {
    const query = z.object({
      year:  z.coerce.number().default(new Date().getFullYear()),
      month: z.coerce.number().min(1).max(12).optional(),
    }).parse(req.query)

    const tid = tenantId(req)
    const start = query.month
      ? new Date(query.year, query.month - 1, 1)
      : new Date(query.year, 0, 1)
    const end = query.month
      ? new Date(query.year, query.month, 0, 23, 59, 59, 999)
      : new Date(query.year, 11, 31, 23, 59, 59, 999)

    // Receita das invoices COM appointment (agrupada por tipo)
    type ServiceRow = { type: string; revenue: bigint | number; count: bigint | number }
    const byService = await app.prisma.$queryRaw<ServiceRow[]>`
      SELECT
        a.type,
        SUM(i.total)::float  AS revenue,
        COUNT(i.id)::int     AS count
      FROM "Invoice" i
      INNER JOIN "Appointment" a ON a.id = i."appointmentId"
      WHERE i."tenantId" = ${tid}
        AND i.status = 'PAID'
        AND i."paidAt" >= ${start}
        AND i."paidAt" <= ${end}
      GROUP BY a.type
    `

    // Receita das invoices SEM appointment (avulso)
    const avulso = await app.prisma.invoice.aggregate({
      where: {
        tenantId:      tid,
        status:        'PAID',
        appointmentId: null,
        paidAt:        { gte: start, lte: end },
      },
      _sum:   { total: true },
      _count: true,
    })

    const typeLabels: Record<string, string> = {
      CONSULTATION: 'Consulta',
      RETURN:       'Retorno',
      VACCINE:      'Vacinação',
      SURGERY:      'Cirurgia',
      EXAM:         'Exame',
      GROOMING:     'Banho e Tosa',
      EMERGENCY:    'Emergência',
    }

    const result = byService.map(r => ({
      type:    r.type,
      label:   typeLabels[r.type] ?? r.type,
      revenue: Number(r.revenue),
      count:   Number(r.count),
    }))

    if (avulso._count > 0) {
      result.push({
        type:    'OTHER',
        label:   'Avulso',
        revenue: avulso._sum.total ?? 0,
        count:   avulso._count,
      })
    }

    return result.sort((a, b) => b.revenue - a.revenue)
  })

  /**
   * GET /api/reports/top-patients?limit=10
   * Pacientes que mais geraram receita (últimos 12 meses).
   */
  app.get('/top-patients', async (req) => {
    const query = z.object({
      limit: z.coerce.number().min(1).max(50).default(10),
    }).parse(req.query)

    const tid = tenantId(req)
    const since = new Date()
    since.setFullYear(since.getFullYear() - 1)

    type PatientRow = { patientId: string; name: string; species: string; revenue: number; invoiceCount: number }
    const rows = await app.prisma.$queryRaw<PatientRow[]>`
      SELECT
        p.id            AS "patientId",
        p.name,
        p.species,
        SUM(i.total)::float AS revenue,
        COUNT(i.id)::int    AS "invoiceCount"
      FROM "Invoice" i
      INNER JOIN "Patient" p ON p.id = i."patientId"
      WHERE i."tenantId" = ${tid}
        AND i.status = 'PAID'
        AND i."paidAt" >= ${since}
      GROUP BY p.id, p.name, p.species
      ORDER BY revenue DESC
      LIMIT ${query.limit}
    `

    return rows
  })
}
