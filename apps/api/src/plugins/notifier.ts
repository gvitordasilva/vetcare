import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import nodemailer from 'nodemailer'

interface SendOptions {
  to: { name: string; email?: string | null; phone?: string | null }
  from: string       // ex: "Clínica VetCare <noreply@...>"
  subject: string
  html: string
  whatsappText?: string  // mensagem plaintext para WhatsApp (mais concisa que o HTML)
}

/**
 * Serviço de notificação plugável.
 *
 * Canais suportados:
 *  - Email via SMTP (nodemailer) — ativo se SMTP_HOST estiver configurado
 *  - WhatsApp via Twilio API REST — ativo se TWILIO_ACCOUNT_SID estiver configurado
 *    Variáveis necessárias: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
 *
 * Retorna array dos canais efetivamente enviados (ex: ['email', 'whatsapp']).
 */
class NotificationService {
  private mailer: nodemailer.Transporter | null = null

  constructor() {
    if (process.env.SMTP_HOST) {
      this.mailer = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    }
  }

  async send(opts: SendOptions): Promise<string[]> {
    const sent: string[] = []

    // ── Email ─────────────────────────────────────────────────────
    if (this.mailer && opts.to.email) {
      try {
        await this.mailer.sendMail({
          from: opts.from,
          to: opts.to.email,
          subject: opts.subject,
          html: opts.html,
        })
        sent.push('email')
      } catch (err) {
        // Não lança — falha silenciosa para não bloquear o fluxo principal
        console.error(`[Notifier] Email failed to ${opts.to.email}:`, err)
      }
    }

    // ── WhatsApp via Twilio REST ───────────────────────────────────
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      opts.to.phone
    ) {
      try {
        const phone = opts.to.phone.replace(/\D/g, '')
        const body = opts.whatsappText || opts.subject
        const accountSid = process.env.TWILIO_ACCOUNT_SID
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
        const auth = Buffer.from(
          `${accountSid}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString('base64')

        const params = new URLSearchParams({
          From: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM || '+14155238886'}`,
          To: `whatsapp:+55${phone}`,
          Body: body,
        })

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        })

        if (res.ok) {
          sent.push('whatsapp')
        } else {
          const errBody = await res.text()
          console.error(`[Notifier] WhatsApp failed (${res.status}): ${errBody}`)
        }
      } catch (err) {
        console.error(`[Notifier] WhatsApp exception:`, err)
      }
    }

    return sent
  }
}

// Augment Fastify instance type
declare module 'fastify' {
  interface FastifyInstance {
    notifier: NotificationService
  }
}

export const notifierPlugin: FastifyPluginAsync = fp(async (app) => {
  app.decorate('notifier', new NotificationService())
})
