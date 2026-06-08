/**
 * Rotas de billing: status, assinatura, pagamentos, cancelamento e webhook Asaas.
 *
 * Nota: POST /subscribe e POST /webhooks/asaas NÃO têm requireActiveSubscription
 * pois são justamente as rotas usadas por tenants sem assinatura ativa.
 */
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate, authorize, tenantId } from '../middleware/auth'
import { requireActiveSubscription, invalidateAccessCache } from '../middleware/planGuard'
import {
  createCustomer,
  createAsaasSubscription,
  cancelAsaasSubscription,
  getSubscriptionPayments,
  getPixQrCode,
  getBoletoData,
  centsToReais,
  toAsaasDate,
} from '../services/asaas'
import { PLAN_PRICES } from '@vetcare/shared'

// ─── Schemas ─────────────────────────────────────────────────────

const subscribeSchema = z.object({
  plan: z.enum(['PRO', 'ENTERPRISE']),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']).default('MONTHLY'),
  paymentMethod: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD']).default('PIX'),
  // Dados do responsável financeiro (para criar cliente no Asaas)
  cpfCnpj: z.string().optional(),
})

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
})

// ─── Plugin ──────────────────────────────────────────────────────

export async function billingRoutes(app: FastifyInstance) {
  /**
   * GET /api/billing/status
   * Retorna o status atual da assinatura/trial do tenant.
   */
  app.get(
    '/status',
    { onRequest: [authenticate] },
    async (req, reply) => {
      const tid = tenantId(req)
      const tenant = await app.prisma.tenant.findUnique({
        where: { id: tid },
        select: {
          trialEndsAt: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              billingCycle: true,
              currentPeriodEnd: true,
              priceInCents: true,
              payments: {
                orderBy: { dueDate: 'desc' },
                take: 1,
                select: {
                  status: true,
                  dueDate: true,
                  paidAt: true,
                  pixQrCode: true,
                  pixCopiaECola: true,
                  boletoUrl: true,
                  boletoBarCode: true,
                },
              },
            },
          },
        },
      })

      if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })

      const now = new Date()
      let status: string
      let trialDaysRemaining: number | undefined

      if (tenant.trialEndsAt && tenant.trialEndsAt > now) {
        status = 'TRIAL'
        const msRemaining = tenant.trialEndsAt.getTime() - now.getTime()
        trialDaysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))
      } else if (!tenant.subscription) {
        status = 'BLOCKED'
      } else if (['ACTIVE', 'PAST_DUE'].includes(tenant.subscription.status)) {
        status = tenant.subscription.status
      } else {
        status = 'BLOCKED'
      }

      return reply.send({
        status,
        trialDaysRemaining,
        trialEndsAt: tenant.trialEndsAt,
        subscription: tenant.subscription
          ? {
              plan: tenant.subscription.plan,
              status: tenant.subscription.status,
              billingCycle: tenant.subscription.billingCycle,
              currentPeriodEnd: tenant.subscription.currentPeriodEnd,
              priceInCents: tenant.subscription.priceInCents,
            }
          : undefined,
        lastPayment: tenant.subscription?.payments[0],
      })
    },
  )

  /**
   * POST /api/billing/subscribe
   * Cria assinatura no Asaas. Disponível mesmo para tenants bloqueados.
   */
  app.post(
    '/subscribe',
    { onRequest: [authenticate, authorize('OWNER')] },
    async (req, reply) => {
      const tid = tenantId(req)
      const data = subscribeSchema.parse(req.body)

      // Verificar se já tem assinatura ativa
      const existing = await app.prisma.subscription.findUnique({
        where: { tenantId: tid },
      })
      if (existing && ['ACTIVE', 'PAST_DUE'].includes(existing.status)) {
        return reply.status(409).send({ error: 'Já existe uma assinatura ativa' })
      }

      const tenant = await app.prisma.tenant.findUnique({
        where: { id: tid },
        select: { name: true, email: true, asaasCustomerId: true },
      })
      if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })

      // Criar cliente no Asaas se ainda não existir
      let asaasCustomerId = tenant.asaasCustomerId
      if (!asaasCustomerId) {
        const customer = await createCustomer({
          name: tenant.name,
          email: tenant.email,
          cpfCnpj: data.cpfCnpj,
        })
        asaasCustomerId = customer.id
        await app.prisma.tenant.update({
          where: { id: tid },
          data: { asaasCustomerId },
        })
      }

      // Calcular valor
      const priceKey = data.billingCycle === 'MONTHLY' ? 'monthly' : 'annual'
      const priceInCents = PLAN_PRICES[data.plan][priceKey]
      const valueInReais = centsToReais(priceInCents)
      const asaasCycle = data.billingCycle === 'MONTHLY' ? 'MONTHLY' : 'YEARLY'

      // Data de início: amanhã (Asaas gera a 1ª cobrança imediatamente)
      const nextDueDate = new Date()
      nextDueDate.setDate(nextDueDate.getDate() + 1)

      // Criar assinatura no Asaas
      const asaasSubscription = await createAsaasSubscription({
        customer: asaasCustomerId,
        billingType: data.paymentMethod,
        cycle: asaasCycle,
        value: valueInReais,
        nextDueDate: toAsaasDate(nextDueDate),
        description: `VetCare ${data.plan} — ${data.billingCycle === 'MONTHLY' ? 'Mensal' : 'Anual'}`,
        externalReference: tid,
      })

      // Calcular período atual
      const periodEnd = new Date(nextDueDate)
      if (data.billingCycle === 'MONTHLY') {
        periodEnd.setMonth(periodEnd.getMonth() + 1)
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      }

      // Criar/atualizar subscription no banco
      let subscription
      if (existing) {
        subscription = await app.prisma.subscription.update({
          where: { tenantId: tid },
          data: {
            plan: data.plan,
            status: 'ACTIVE',
            billingCycle: data.billingCycle,
            asaasSubscriptionId: asaasSubscription.id,
            currentPeriodStart: nextDueDate,
            currentPeriodEnd: periodEnd,
            cancelledAt: null,
            cancelReason: null,
            priceInCents,
          },
        })
      } else {
        subscription = await app.prisma.subscription.create({
          data: {
            tenantId: tid,
            plan: data.plan,
            status: 'ACTIVE',
            billingCycle: data.billingCycle,
            asaasSubscriptionId: asaasSubscription.id,
            currentPeriodStart: nextDueDate,
            currentPeriodEnd: periodEnd,
            priceInCents,
          },
        })
      }

      // Buscar cobranças criadas pelo Asaas e persistir a primeira
      const chargesResult = await getSubscriptionPayments(asaasSubscription.id)
      const firstCharge = chargesResult.data?.[0]

      let billingPayment: any = null
      if (firstCharge) {
        // Buscar dados de PIX ou boleto
        let pixQrCode: string | undefined
        let pixCopiaECola: string | undefined
        let boletoUrl: string | undefined
        let boletoBarCode: string | undefined

        try {
          if (data.paymentMethod === 'PIX') {
            const pix = await getPixQrCode(firstCharge.id)
            pixQrCode = pix.encodedImage
            pixCopiaECola = pix.payload
          } else if (data.paymentMethod === 'BOLETO') {
            const boleto = await getBoletoData(firstCharge.id)
            boletoUrl = firstCharge.bankSlipUrl
            boletoBarCode = boleto.identificationField
          }
        } catch {
          // PIX/boleto pode ainda não estar disponível — retornamos sem ele
        }

        billingPayment = await app.prisma.billingPayment.create({
          data: {
            subscriptionId: subscription.id,
            asaasChargeId: firstCharge.id,
            amountInCents: Math.round(firstCharge.value * 100),
            status: 'PENDING',
            paymentMethod: data.paymentMethod,
            dueDate: new Date(firstCharge.dueDate),
            pixQrCode,
            pixCopiaECola,
            boletoUrl,
            boletoBarCode,
          },
        })
      }

      // Atualizar plano do tenant
      await app.prisma.tenant.update({
        where: { id: tid },
        data: { plan: data.plan },
      })

      invalidateAccessCache(tid)

      return reply.status(201).send({
        subscription,
        payment: billingPayment,
      })
    },
  )

  /**
   * GET /api/billing/payments
   * Lista histórico de pagamentos.
   */
  app.get(
    '/payments',
    { onRequest: [authenticate, authorize('OWNER'), requireActiveSubscription] },
    async (req, reply) => {
      const tid = tenantId(req)

      const subscription = await app.prisma.subscription.findUnique({
        where: { tenantId: tid },
        include: {
          payments: {
            orderBy: { dueDate: 'desc' },
          },
        },
      })

      if (!subscription) return reply.send({ data: [], total: 0 })

      return reply.send({
        data: subscription.payments,
        total: subscription.payments.length,
      })
    },
  )

  /**
   * GET /api/billing/payments/:id
   * Detalhes de um pagamento com dados de PIX/boleto atualizados.
   */
  app.get(
    '/payments/:id',
    { onRequest: [authenticate, authorize('OWNER'), requireActiveSubscription] },
    async (req, reply) => {
      const tid = tenantId(req)
      const { id } = req.params as { id: string }

      const payment = await app.prisma.billingPayment.findFirst({
        where: {
          id,
          subscription: { tenantId: tid },
        },
      })
      if (!payment) return reply.status(404).send({ error: 'Pagamento não encontrado' })

      // Se ainda pendente e tem charge no Asaas, atualizar dados PIX/boleto
      if (payment.status === 'PENDING' && payment.asaasChargeId) {
        try {
          if (payment.paymentMethod === 'PIX' && !payment.pixQrCode) {
            const pix = await getPixQrCode(payment.asaasChargeId)
            const updated = await app.prisma.billingPayment.update({
              where: { id: payment.id },
              data: {
                pixQrCode: pix.encodedImage,
                pixCopiaECola: pix.payload,
              },
            })
            return reply.send(updated)
          }
          if (payment.paymentMethod === 'BOLETO' && !payment.boletoBarCode) {
            const boleto = await getBoletoData(payment.asaasChargeId)
            const updated = await app.prisma.billingPayment.update({
              where: { id: payment.id },
              data: {
                boletoBarCode: boleto.identificationField,
              },
            })
            return reply.send(updated)
          }
        } catch {
          // Falha ao buscar dados atualizados — retorna o que tem no banco
        }
      }

      return reply.send(payment)
    },
  )

  /**
   * POST /api/billing/cancel
   * Cancela a assinatura; acesso continua até o fim do período pago.
   */
  app.post(
    '/cancel',
    { onRequest: [authenticate, authorize('OWNER'), requireActiveSubscription] },
    async (req, reply) => {
      const tid = tenantId(req)
      const { reason } = cancelSchema.parse(req.body ?? {})

      const subscription = await app.prisma.subscription.findUnique({
        where: { tenantId: tid },
      })
      if (!subscription) return reply.status(404).send({ error: 'Assinatura não encontrada' })
      if (subscription.status === 'CANCELLED') {
        return reply.status(409).send({ error: 'Assinatura já cancelada' })
      }

      // Cancelar no Asaas
      if (subscription.asaasSubscriptionId) {
        try {
          await cancelAsaasSubscription(subscription.asaasSubscriptionId)
        } catch (err) {
          app.log.warn({ err }, 'Falha ao cancelar assinatura no Asaas')
        }
      }

      const updated = await app.prisma.subscription.update({
        where: { tenantId: tid },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      })

      invalidateAccessCache(tid)

      return reply.send({
        message: `Assinatura cancelada. O acesso continua até ${subscription.currentPeriodEnd.toLocaleDateString('pt-BR')}.`,
        subscription: updated,
      })
    },
  )

  /**
   * POST /api/billing/webhooks/asaas
   * Recebe eventos do Asaas. Validado via header asaas-access-token.
   * Rota pública — NÃO tem authenticate nem requireActiveSubscription.
   */
  app.post(
    '/webhooks/asaas',
    async (req, reply) => {
      const token = req.headers['asaas-access-token']
      if (!token || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
        return reply.status(401).send({ error: 'Token inválido' })
      }

      const payload = req.body as any
      const event = payload?.event as string
      const payment = payload?.payment

      if (!event) return reply.send({ received: true })

      app.log.info({ event, paymentId: payment?.id }, 'Asaas webhook recebido')

      // Encontrar a cobrança no banco pelo asaasChargeId
      if (payment?.id) {
        const billingPayment = await app.prisma.billingPayment.findUnique({
          where: { asaasChargeId: payment.id },
          include: { subscription: true },
        })

        if (billingPayment) {
          const { tenantId: tid } = billingPayment.subscription

          // Registrar evento de auditoria
          await app.prisma.billingEvent.create({
            data: { tenantId: tid, event, payload },
          })

          if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
            await app.prisma.billingPayment.update({
              where: { id: billingPayment.id },
              data: {
                status: event === 'PAYMENT_RECEIVED' ? 'RECEIVED' : 'CONFIRMED',
                paidAt: new Date(),
              },
            })
            await app.prisma.subscription.update({
              where: { tenantId: tid },
              data: { status: 'ACTIVE' },
            })
            invalidateAccessCache(tid)
          } else if (event === 'PAYMENT_OVERDUE') {
            await app.prisma.billingPayment.update({
              where: { id: billingPayment.id },
              data: { status: 'OVERDUE' },
            })
            await app.prisma.subscription.update({
              where: { tenantId: tid },
              data: { status: 'PAST_DUE' },
            })
            invalidateAccessCache(tid)
          }
        }
      }

      // Evento de assinatura deletada
      if (event === 'SUBSCRIPTION_DELETED' && payload?.subscription?.id) {
        const subscription = await app.prisma.subscription.findUnique({
          where: { asaasSubscriptionId: payload.subscription.id },
        })
        if (subscription) {
          await app.prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: 'CANCELLED', cancelledAt: new Date() },
          })
          await app.prisma.billingEvent.create({
            data: {
              tenantId: subscription.tenantId,
              event,
              payload,
            },
          })
          invalidateAccessCache(subscription.tenantId)
        }
      }

      return reply.send({ received: true })
    },
  )
}
