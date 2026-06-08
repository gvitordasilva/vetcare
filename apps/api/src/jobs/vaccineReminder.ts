import cron from 'node-cron'
import nodemailer from 'nodemailer'
import { FastifyInstance } from 'fastify'

export function startVaccineReminderJob(app: FastifyInstance) {
  // Runs every day at 8 AM
  cron.schedule('0 8 * * *', async () => {
    app.log.info('Running vaccine reminder job...')

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const inDays = (days: number) => {
      const d = new Date()
      d.setDate(d.getDate() + days)
      d.setHours(0, 0, 0, 0)
      return d
    }

    // Find vaccines due in exactly 7 days
    const reminderDate = inDays(7)
    const dayAfter = inDays(8)

    const vaccines = await app.prisma.vaccine.findMany({
      where: {
        nextDoseAt: { gte: reminderDate, lt: dayAfter },
        reminderSent: false,
      },
      include: {
        patient: { include: { owner: true } },
        tenant: { select: { name: true, phone: true } },
      },
    })

    for (const vaccine of vaccines) {
      const ownerEmail = vaccine.patient.owner.email
      if (!ownerEmail) continue

      try {
        await transporter.sendMail({
          from: `"${vaccine.tenant.name}" <${process.env.SMTP_USER}>`,
          to: ownerEmail,
          subject: `⚠️ Lembrete de Vacina – ${vaccine.patient.name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #16a34a;">VetCare – Lembrete de Vacina</h2>
              <p>Olá, <strong>${vaccine.patient.owner.name}</strong>!</p>
              <p>
                A próxima dose da vacina <strong>${vaccine.name}</strong> do(a)
                <strong>${vaccine.patient.name}</strong> está prevista para
                <strong>${vaccine.nextDoseAt!.toLocaleDateString('pt-BR')}</strong>.
              </p>
              <p>Entre em contato com a clínica para agendar: <strong>${vaccine.tenant.phone}</strong></p>
              <hr/>
              <p style="color: #6b7280; font-size: 12px;">${vaccine.tenant.name}</p>
            </div>
          `,
        })

        await app.prisma.vaccine.update({
          where: { id: vaccine.id },
          data: { reminderSent: true },
        })

        app.log.info(`Reminder sent for vaccine ${vaccine.id}`)
      } catch (err) {
        app.log.error({ err }, `Failed to send reminder for vaccine ${vaccine.id}`)
      }
    }
  })
}
