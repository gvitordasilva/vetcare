'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi } from '@/lib/api'
import { useBillingStatus } from '@/hooks/useBillingStatus'
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  ExternalLink,
  QrCode,
  Loader2,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  TRIAL:    { label: 'Trial ativo',       color: 'blue',   icon: Clock },
  ACTIVE:   { label: 'Ativo',             color: 'green',  icon: CheckCircle },
  PAST_DUE: { label: 'Pagamento em atraso', color: 'amber', icon: AlertCircle },
  BLOCKED:  { label: 'Bloqueado',          color: 'red',   icon: XCircle },
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING:   'Aguardando',
  CONFIRMED: 'Confirmado',
  RECEIVED:  'Recebido',
  OVERDUE:   'Vencido',
  REFUNDED:  'Estornado',
  CANCELLED: 'Cancelado',
}

function PaymentStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING:   'bg-amber-100 text-amber-700',
    CONFIRMED: 'bg-green-100 text-green-700',
    RECEIVED:  'bg-green-100 text-green-700',
    OVERDUE:   'bg-red-100 text-red-700',
    REFUNDED:  'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {PAYMENT_STATUS_LABELS[status] ?? status}
    </span>
  )
}

export default function BillingPage() {
  const queryClient = useQueryClient()
  const { data: billing, isLoading } = useBillingStatus()
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const { mutate: cancelSub, isPending: cancelling } = useMutation({
    mutationFn: () => billingApi.cancel(cancelReason || undefined),
    onSuccess: () => {
      setCancelConfirm(false)
      queryClient.invalidateQueries({ queryKey: ['billing-status'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const sub = billing?.subscription
  const statusInfo = billing?.status ? STATUS_LABELS[billing.status] : null

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-gray-600" />
        <h1 className="text-xl font-semibold text-gray-900">Assinatura</h1>
      </div>

      {/* Banner de status */}
      {statusInfo && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          billing?.status === 'ACTIVE'   ? 'bg-green-50 border-green-200' :
          billing?.status === 'TRIAL'    ? 'bg-blue-50 border-blue-200' :
          billing?.status === 'PAST_DUE' ? 'bg-amber-50 border-amber-200' :
          'bg-red-50 border-red-200'
        }`}>
          <statusInfo.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
            billing?.status === 'ACTIVE'   ? 'text-green-600' :
            billing?.status === 'TRIAL'    ? 'text-blue-600' :
            billing?.status === 'PAST_DUE' ? 'text-amber-600' :
            'text-red-600'
          }`} />
          <div>
            <p className="font-medium text-gray-900 text-sm">{statusInfo.label}</p>
            {billing?.status === 'TRIAL' && (
              <p className="text-sm text-gray-600">
                {billing.trialDaysRemaining} dia(s) restante(s) no período de teste.
                {' '}<Link href="/assinar" className="font-medium text-blue-600 hover:underline">Assinar agora</Link>
              </p>
            )}
            {billing?.status === 'PAST_DUE' && (
              <p className="text-sm text-gray-600">
                Regularize o pagamento para manter o acesso.
              </p>
            )}
            {billing?.status === 'BLOCKED' && (
              <p className="text-sm text-gray-600">
                Seu acesso está bloqueado.{' '}
                <Link href="/assinar" className="font-medium text-blue-600 hover:underline">
                  Assinar agora
                </Link>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Dados do plano */}
      {sub && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Plano atual</p>
              <h2 className="text-lg font-semibold text-gray-900">{sub.plan}</h2>
              <p className="text-sm text-gray-500">
                {sub.billingCycle === 'MONTHLY' ? 'Mensal' : 'Anual'} ·{' '}
                R${(sub.priceInCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
              </p>
            </div>
            {sub.plan === 'PRO' && sub.status === 'ACTIVE' && (
              <Link
                href="/assinar"
                className="flex items-center gap-1.5 text-sm bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 font-medium"
              >
                <TrendingUp className="w-4 h-4" />
                Upgrade para ENTERPRISE
              </Link>
            )}
          </div>

          {sub.status !== 'CANCELLED' && (
            <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
              {sub.status === 'ACTIVE' && (
                <p>Próxima renovação: <strong className="text-gray-900">
                  {new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR')}
                </strong></p>
              )}
              {sub.status === 'CANCELLED' && (
                <p>Acesso até: <strong className="text-gray-900">
                  {new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR')}
                </strong></p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Histórico de pagamentos */}
      {billing?.status !== 'TRIAL' && billing?.status !== 'BLOCKED' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Histórico de pagamentos</h3>
          </div>
          <PaymentsTable />
        </div>
      )}

      {/* Zona de cancelamento */}
      {sub && ['ACTIVE', 'PAST_DUE'].includes(sub.status) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Cancelar assinatura</h3>
          <p className="text-sm text-gray-500 mb-4">
            O acesso continua até {new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR')}.
            Nenhum reembolso proporcional.
          </p>

          {!cancelConfirm ? (
            <button
              onClick={() => setCancelConfirm(true)}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Cancelar assinatura
            </button>
          ) : (
            <div className="space-y-3">
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Motivo do cancelamento (opcional)"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => cancelSub()}
                  disabled={cancelling}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60"
                >
                  {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirmar cancelamento
                </button>
                <button
                  onClick={() => setCancelConfirm(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PaymentsTable() {
  const { data, isLoading } = useBillingStatus()
  // We'll show the last payment from billing status for simplicity
  const lastPayment = data?.lastPayment

  if (isLoading) return <div className="p-6 text-center text-sm text-gray-400">Carregando...</div>
  if (!lastPayment) return <div className="p-6 text-center text-sm text-gray-400">Nenhum pagamento encontrado.</div>

  return (
    <div className="p-6 text-sm text-gray-600">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">
            Vencimento: {new Date(lastPayment.dueDate).toLocaleDateString('pt-BR')}
          </p>
          {lastPayment.paidAt && (
            <p className="text-xs text-gray-400">
              Pago em: {new Date(lastPayment.paidAt).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <PaymentStatusBadge status={lastPayment.status} />
          {lastPayment.status === 'PENDING' && lastPayment.boletoUrl && (
            <a
              href={lastPayment.boletoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Ver boleto
            </a>
          )}
          {lastPayment.status === 'PENDING' && lastPayment.pixCopiaECola && (
            <button
              onClick={() => navigator.clipboard.writeText(lastPayment.pixCopiaECola!)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <QrCode className="w-3 h-3" />
              Copiar PIX
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
