'use client'

import { useQuery } from '@tanstack/react-query'
import { billingApi } from '@/lib/api'
import type { BillingStatus } from '@vetcare/shared'

/**
 * Hook para verificar o status de billing do tenant logado.
 * Refresca a cada 60 segundos para refletir confirmações de pagamento.
 *
 * Retorna:
 * - status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'BLOCKED'
 * - trialDaysRemaining: número de dias restantes no trial (se em trial)
 * - subscription: dados da assinatura (se existente)
 * - lastPayment: último pagamento (com QR code / boleto se pendente)
 */
export function useBillingStatus() {
  return useQuery<BillingStatus>({
    queryKey: ['billing-status'],
    queryFn: () => billingApi.status(),
    staleTime: 60_000,       // 60s — não revalida a cada render
    refetchInterval: 60_000, // polling leve para pegar confirmação de pagamento
    retry: false,            // não atrapalha rotas sem autenticação
  })
}
