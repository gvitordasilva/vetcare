import cron from 'node-cron'
import { FastifyInstance } from 'fastify'

/**
 * Job que envia lembrete de consulta 24h antes do horário agendado.
 *
 * Roda a cada hora — verifica agendamentos com scheduledAt entre
 * agora+23h e agora+25h que ainda não tiveram lembrete enviado.
 * Usa a janela de 2h para absorver imprecisões de horário de execução
 * sem disparar duplicatas (reminderSent garante idempotência).
 *
 * Notifica via email e/ou WhatsApp (se configurado) usando o NotificationService.
 */
export function startAppointmentReminderJob(app: FastifyInstance) {
  cron.schedule('0 * * * *', async () => {
    app.log.info('Running appointment reminder job...')

    try {
      const now = new Date()
      const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000)
      const windowEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000)

      const appointments = await app.prisma.appointment.findMany({
        where: {
          scheduledAt: { gte: windowStart, lte: windowEnd },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
          reminderSent: false,
        },
        include: {
          patient: { include: { owner: true } },
          vet:     { select: { id: true, name: true } },
          tenant:  { select: { name: true, phone: true, email: true } },
        },
      })

      for (const appt of appointments) {
        const owner = appt.patient.owner
        if (!owner.email && !owner.phone) continue

        const dateStr = appt.scheduledAt.toLocaleDateString('pt-BR')
        const timeStr = appt.scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        const typeLabels: Record<string, string> = {
          CONSULTATION: 'Consulta',
          RETURN:       'Retorno',
          VACCINE:      'Vacinação',
          SURGERY:      'Cirurgia',
          EXAM:         'Exame',
          GROOMING:     'Banho e Tosa',
          EMERGENCY:    'Emergência',
        }
        const typeLabel = typeLabels[appt.type] ?? appt.type

        try {
          await app.notifier.send({
            to:   { name: owner.name, email: owner.email, phone: owner.phone },
            from: `"${appt.tenant.name}" <${process.env.SMTP_USER}>`,
            subject: `📅 Lembrete: ${typeLabel} de ${appt.patient.name} amanhã às ${timeStr}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #16a34a;">${appt.tenant.name} — Lembrete de Consulta</h2>
                <p>Olá, <strong>${owner.name}</strong>!</p>
                <p>
                  Lembramos que <strong>${appt.patient.name}</strong> tem
                  <strong>${typeLabel}</strong> agendada para amanhã,
                  <strong>${dateStr}</strong> às <strong>${timeStr}</strong>
                  com o(a) Dr(a). <strong>${appt.vet.name}</strong>.
                </p>
                ${appt.notes ? `<p><em>Observações: ${appt.notes}</em></p>` : ''}
                <p>Dúvidas? Entre em contato: <strong>${appt.tenant.phone}</strong></p>
                <hr/>
                <p style="color: #6b7280; font-size: 12px;">${appt.tenant.name}</p>
              </div>
            `,
            whatsappText:
              `Olá ${owner.name}! 🐾 Lembrete: ${appt.patient.name} tem ${typeLabel} amanhã (${dateStr}) às ${timeStr} na ${appt.tenant.name}. Qualquer dúvida: ${appt.tenant.phone}`,
          })

          await app.prisma.appointment.update({
            where: { id: appt.id },
            data:  { reminderSent: true },
          })

          app.log.info(`Appointment reminder sent for ${appt.id}`)
        } catch (err) {
          app.log.error({ err }, `Failed to send reminder for appointment ${appt.id}`)
        }
      }
    } catch (err) {
      app.log.error({ err }, 'Appointment reminder job failed')
    }
  })
}
