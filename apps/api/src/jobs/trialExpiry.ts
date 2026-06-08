/**
 * Job diário (09h) que notifica tenants cujo trial expirou sem assinatura ativa.
 *
 * O acesso já é bloqueado automaticamente pela lógica de `getAccessStatus` em
 * planGuard.ts (trialEndsAt expirado + sem subscription ativa = BLOCKED).
 * Este job apenas envia o email de aviso para o OWNER da clínica.
 */
import cron from 'node-cron'
import nodemailer from 'nodemailer'
import { FastifyInstance } from 'fastify'

export function startTrialExpiryJob(app: FastifyInstance) {
  if (process.env.NODE_ENV === 'test') return

  // Executa todo dia às 9h
  cron.schedule('0 9 * * *', async () => {
    app.log.info('Trial expiry job: verificando trials expirados...')

    try {
      const expiredTrials = await app.prisma.tenant.findMany({
        where: {
          trialEndsAt: { lt: new Date() },
          active: true,
          subscription: null,  // sem assinatura ativa
        },
        include: {
          users: {
            where: { role: 'OWNER', active: true },
            select: { name: true, email: true },
            take: 1,
          },
        },
      })

      if (expiredTrials.length === 0) {
        app.log.info('Trial expiry job: nenhum trial expirado sem assinatura.')
        return
      }

      app.log.info(`Trial expiry job: ${expiredTrials.length} trial(s) expirado(s).`)

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })

      for (const tenant of expiredTrials) {
        const owner = tenant.users[0]
        if (!owner) continue

        try {
          await transporter.sendMail({
            from: `"VetCare" <${process.env.SMTP_USER}>`,
            to: owner.email,
            subject: 'Seu período de teste VetCare expirou — assine para continuar',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a56db;">Olá, ${owner.name}!</h2>
                <p>
                  Seu período de teste gratuito de 14 dias da clínica
                  <strong>${tenant.name}</strong> no VetCare expirou.
                </p>
                <p>
                  Para continuar usando todos os recursos — prontuários, agendamentos,
                  vacinas, financeiro e muito mais — escolha um plano e assine agora:
                </p>
                <div style="margin: 24px 0;">
                  <a href="${process.env.APP_URL ?? 'https://vetcare.com.br'}/assinar"
                     style="background: #1a56db; color: white; padding: 12px 24px;
                            border-radius: 6px; text-decoration: none; font-weight: bold;">
                    Ver planos e assinar
                  </a>
                </div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="font-size: 12px; color: #6b7280;">
                  Plano PRO: R$197/mês &nbsp;·&nbsp; Plano ENTERPRISE: R$497/mês<br/>
                  Pagamento via PIX, boleto bancário ou cartão de crédito.
                </p>
              </div>
            `,
          })
          app.log.info(`Trial expiry: email enviado para ${owner.email} (${tenant.name})`)
        } catch (err) {
          app.log.warn({ err }, `Trial expiry: falha ao enviar email para ${owner.email}`)
        }
      }
    } catch (err) {
      app.log.error({ err }, 'Trial expiry job: erro inesperado')
    }
  })
}
