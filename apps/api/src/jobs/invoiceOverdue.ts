import cron from 'node-cron'
import { FastifyInstance } from 'fastify'

/**
 * Job diário que marca como OVERDUE as cobranças vencidas e não pagas.
 * Roda à meia-noite — logo após virar o dia, qualquer invoice com dueDate
 * anterior a hoje e ainda PENDING passa para OVERDUE.
 *
 * Isso permite que o dashboard e relatórios financeiros mostrem inadimplência
 * real, separando "pendente" (prazo em aberto) de "vencido" (atrasado).
 */
export function startInvoiceOverdueJob(app: FastifyInstance) {
  cron.schedule('0 0 * * *', async () => {
    app.log.info('Running invoice overdue job...')

    try {
      const now = new Date()
      now.setHours(0, 0, 0, 0) // início do dia corrente

      const result = await app.prisma.invoice.updateMany({
        where: {
          status: 'PENDING',
          dueDate: { lt: now },
        },
        data: { status: 'OVERDUE' },
      })

      if (result.count > 0) {
        app.log.info(`Invoice overdue job: ${result.count} invoice(s) marcadas como OVERDUE`)
      }
    } catch (err) {
      app.log.error({ err }, 'Invoice overdue job failed')
    }
  })
}
