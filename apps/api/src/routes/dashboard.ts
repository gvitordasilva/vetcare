import { FastifyPluginAsync } from 'fastify'
import { authenticate, tenantId } from '../middleware/auth'
import { requireActiveSubscription } from '../middleware/planGuard'

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate)
  app.addHook('onRequest', requireActiveSubscription)

  app.get('/', async (req) => {
    const tid = tenantId(req)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
    const soon30 = new Date()
    soon30.setDate(soon30.getDate() + 30)

    const [
      todayAppointments,
      monthAppointments,
      totalPatients,
      totalOwners,
      pendingInvoices,
      monthRevenue,
      vaccinesDueSoon,
      recentConsultations,
    ] = await Promise.all([
      app.prisma.appointment.count({
        where: { tenantId: tid, scheduledAt: { gte: today, lt: tomorrow } },
      }),
      app.prisma.appointment.count({
        where: { tenantId: tid, scheduledAt: { gte: monthStart, lte: monthEnd } },
      }),
      app.prisma.patient.count({ where: { tenantId: tid, active: true } }),
      app.prisma.owner.count({ where: { tenantId: tid } }),
      app.prisma.invoice.count({ where: { tenantId: tid, status: 'PENDING' } }),
      app.prisma.invoice.aggregate({
        where: { tenantId: tid, status: 'PAID', paidAt: { gte: monthStart, lte: monthEnd } },
        _sum: { total: true },
      }),
      app.prisma.vaccine.count({
        where: { tenantId: tid, nextDoseAt: { gte: new Date(), lte: soon30 }, reminderSent: false },
      }),
      app.prisma.consultation.findMany({
        where: { tenantId: tid },
        include: {
          patient: { select: { id: true, name: true, species: true } },
          vet: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        take: 5,
      }),
    ])

    // Today's schedule
    const todaySchedule = await app.prisma.appointment.findMany({
      where: { tenantId: tid, scheduledAt: { gte: today, lt: tomorrow } },
      include: {
        patient: { select: { id: true, name: true, species: true, photoUrl: true } },
        vet: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    return {
      stats: {
        todayAppointments,
        monthAppointments,
        totalPatients,
        totalOwners,
        pendingInvoices,
        monthRevenue: monthRevenue._sum.total ?? 0,
        vaccinesDueSoon,
      },
      todaySchedule,
      recentConsultations,
    }
  })

  app.get('/revenue', async (req) => {
    const tid = tenantId(req)

    // Calcular intervalos primeiro, depois executar TODAS as queries em paralelo
    const ranges = Array.from({ length: 6 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - i))
      const start = new Date(date.getFullYear(), date.getMonth(), 1)
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
      return { start, end, label: start.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }) }
    })

    const results = await Promise.all(
      ranges.map(({ start, end }) =>
        app.prisma.invoice.aggregate({
          where: { tenantId: tid, status: 'PAID', paidAt: { gte: start, lte: end } },
          _sum: { total: true },
          _count: true,
        })
      )
    )

    return ranges.map(({ label }, i) => ({
      month: label,
      revenue: results[i]._sum.total ?? 0,
      invoices: results[i]._count,
    }))
  })
}
