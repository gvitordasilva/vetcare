/**
 * Middleware de controle de acesso por assinatura.
 *
 * requireActiveSubscription — aplicado em todas as rotas de negócio.
 *   Retorna 402 se o tenant não tiver trial ativo nem assinatura válida.
 *
 * checkLimit — verifica limites quantitativos do plano PRO.
 *   Retorna 429 se o tenant tiver atingido o limite.
 *   Tenants em trial e ENTERPRISE são ilimitados.
 */
import { FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { PLAN_LIMITS, AccessStatus } from '@vetcare/shared'
import { tenantId } from './auth'

// Cache em memória: tenantId → { status, expiresAt }
const accessCache = new Map<string, { status: AccessStatus; expiresAt: number }>()
const CACHE_TTL_MS = 60_000 // 60 segundos

export function invalidateAccessCache(tid: string) {
  accessCache.delete(tid)
}

async function getAccessStatus(
  prisma: PrismaClient,
  tid: string,
): Promise<AccessStatus> {
  const cached = accessCache.get(tid)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.status
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tid },
    select: {
      active: true,
      trialEndsAt: true,
      subscription: { select: { status: true } },
    },
  })

  if (!tenant || !tenant.active) {
    accessCache.set(tid, { status: 'BLOCKED', expiresAt: Date.now() + CACHE_TTL_MS })
    return 'BLOCKED'
  }

  let status: AccessStatus

  if (tenant.trialEndsAt && tenant.trialEndsAt > new Date()) {
    status = 'TRIAL'
  } else if (!tenant.subscription) {
    status = 'BLOCKED'
  } else if (tenant.subscription.status === 'ACTIVE') {
    status = 'ACTIVE'
  } else if (tenant.subscription.status === 'PAST_DUE') {
    status = 'PAST_DUE'
  } else {
    // SUSPENDED, CANCELLED, TRIALING sem trial ativo
    status = 'BLOCKED'
  }

  accessCache.set(tid, { status, expiresAt: Date.now() + CACHE_TTL_MS })
  return status
}

/**
 * Hook onRequest: exige trial ativo ou assinatura válida.
 * Retorna 402 Payment Required se o tenant estiver bloqueado.
 *
 * Em NODE_ENV=test o check é desativado — os testes de integração focam
 * na lógica de negócio e não precisam do setup completo de billing.
 */
export async function requireActiveSubscription(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  if (process.env.NODE_ENV === 'test') return
  const tid = tenantId(req)
  const prisma = (req.server as any).prisma as PrismaClient
  const status = await getAccessStatus(prisma, tid)

  if (status === 'BLOCKED') {
    return reply.status(402).send({
      error: 'Assinatura expirada ou inexistente. Acesse /assinar para continuar.',
      subscriptionRequired: true,
    })
  }
}

/**
 * Hook onRequest: verifica limite quantitativo para o plano PRO.
 * Trial e ENTERPRISE são ilimitados — o guard retorna imediatamente.
 *
 * @param resource - nome legível do recurso (usado na mensagem de erro)
 * @param countFn  - função async que retorna a contagem atual para o tenant
 * @param limitKey - chave em PLAN_LIMITS.PRO para comparar
 */
export function checkLimit(
  resource: string,
  countFn: (prisma: PrismaClient, tid: string) => Promise<number>,
  limitKey: keyof typeof PLAN_LIMITS.PRO,
) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const tid = tenantId(req)
    const prisma = (req.server as any).prisma as PrismaClient

    // Verificar plano atual
    const tenant = await prisma.tenant.findUnique({
      where: { id: tid },
      select: { plan: true, trialEndsAt: true, subscription: true },
    })

    if (!tenant) return // guard anterior já bloquearia

    // Trial e ENTERPRISE são ilimitados
    const onTrial = tenant.trialEndsAt && tenant.trialEndsAt > new Date()
    if (onTrial || tenant.plan === 'ENTERPRISE') return

    // Verificar o limite do PRO
    const limit = PLAN_LIMITS.PRO[limitKey] as number
    if (!isFinite(limit)) return  // caso improvável — limite Infinity no PRO

    const current = await countFn(prisma, tid)
    if (current >= limit) {
      return reply.status(429).send({
        error: `Limite de ${resource} atingido para o plano PRO (máximo: ${limit}). Faça upgrade para ENTERPRISE.`,
        upgradeRequired: true,
        resource,
        limit,
        current,
      })
    }
  }
}
