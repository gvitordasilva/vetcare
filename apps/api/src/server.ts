import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { ZodError } from 'zod'

import { prismaPlugin } from './plugins/prisma'
import { notifierPlugin } from './plugins/notifier'
import { storagePlugin } from './plugins/storage'
import { authRoutes } from './routes/auth'
import { tenantRoutes } from './routes/tenants'
import { ownerRoutes } from './routes/owners'
import { patientRoutes } from './routes/patients'
import { appointmentRoutes } from './routes/appointments'
import { consultationRoutes } from './routes/consultations'
import { vaccineRoutes } from './routes/vaccines'
import { invoiceRoutes } from './routes/invoices'
import { productRoutes } from './routes/products'
import { dashboardRoutes } from './routes/dashboard'
import { superAdminRoutes } from './routes/superadmin'
import { hospitalizationRoutes } from './routes/hospitalizations'
import { groomingRoutes } from './routes/grooming'
import { portalRoutes } from './routes/portal'
import { reportsRoutes } from './routes/reports'
import { fiscalRoutes } from './routes/fiscal'
import { commissionRoutes } from './routes/commissions'
import { teleconsultationRoutes } from './routes/teleconsultation'
import { aiScribeRoutes } from './routes/aiScribe'
import { billingRoutes } from './routes/billing'
import { startVaccineReminderJob } from './jobs/vaccineReminder'
import { startInvoiceOverdueJob } from './jobs/invoiceOverdue'
import { startAppointmentReminderJob } from './jobs/appointmentReminder'
import { startTrialExpiryJob } from './jobs/trialExpiry'

const app = Fastify({
  logger: {
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
})

async function bootstrap() {
  // Security
  await app.register(helmet, {
    // CSP restrito para a API REST — bloqueia execução de scripts inline,
    // objetos e frames que não fazem sentido numa API JSON pura.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc:  ["'none'"],
        objectSrc:  ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Necessário para serving de imagens/PDF via /uploads
  })

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })

  // Auth
  await app.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { expiresIn: '15m' },
  })

  // Multipart (file upload)
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  })

  // Database
  await app.register(prismaPlugin)

  // Plugins de serviço
  await app.register(notifierPlugin)
  await app.register(storagePlugin)

  // Routes
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(tenantRoutes, { prefix: '/api/tenant' })
  await app.register(ownerRoutes, { prefix: '/api/owners' })
  await app.register(patientRoutes, { prefix: '/api/patients' })
  await app.register(appointmentRoutes, { prefix: '/api/appointments' })
  await app.register(consultationRoutes, { prefix: '/api/consultations' })
  await app.register(vaccineRoutes, { prefix: '/api/vaccines' })
  await app.register(invoiceRoutes, { prefix: '/api/invoices' })
  await app.register(productRoutes, { prefix: '/api/products' })
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' })
  await app.register(superAdminRoutes, { prefix: '/api/superadmin' })
  await app.register(hospitalizationRoutes, { prefix: '/api/hospitalizations' })
  await app.register(groomingRoutes, { prefix: '/api/grooming' })
  await app.register(portalRoutes, { prefix: '/api/portal' })
  await app.register(reportsRoutes,         { prefix: '/api/reports' })
  await app.register(fiscalRoutes,          { prefix: '/api/fiscal' })
  await app.register(commissionRoutes,      { prefix: '/api/commissions' })
  await app.register(teleconsultationRoutes,{ prefix: '/api/teleconsultation' })
  await app.register(aiScribeRoutes,        { prefix: '/api/ai-scribe' })
  await app.register(billingRoutes,         { prefix: '/api/billing' })

  // ── Error handler global ─────────────────────────────────────────────────
  // ZodError lançado por schema.parse() retornaria 500 sem isso.
  // Aqui capturamos e devolvemos 400 com a mensagem do primeiro erro de validação.
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      const first = err.errors[0]
      const field = first.path.length ? `${first.path.join('.')}: ` : ''
      return reply.status(400).send({ error: `${field}${first.message}` })
    }
    // Repassa todos os outros erros para o handler padrão do Fastify (loga + 500)
    reply.send(err)
  })

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // Background jobs
  if (process.env.NODE_ENV !== 'test') {
    startVaccineReminderJob(app)
    startInvoiceOverdueJob(app)
    startAppointmentReminderJob(app)
    startTrialExpiryJob(app)
  }

  await app.listen({
    port: Number(process.env.PORT) || 3001,
    host: '0.0.0.0',
  })
}

bootstrap().catch((err) => {
  app.log.error(err)
  process.exit(1)
})
