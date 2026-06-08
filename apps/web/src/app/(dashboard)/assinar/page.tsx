'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi } from '@/lib/api'
import {
  Zap,
  Building2,
  Check,
  AlertCircle,
  QrCode,
  FileText,
  CreditCard,
  Loader2,
} from 'lucide-react'
import { PLAN_PRICES } from '@vetcare/shared'

type Plan = 'PRO' | 'ENTERPRISE'
type Cycle = 'MONTHLY' | 'ANNUAL'
type Method = 'PIX' | 'BOLETO' | 'CREDIT_CARD'

const PLAN_FEATURES: Record<Plan, string[]> = {
  PRO: ['Até 15 usuários', 'Até 2.000 pacientes', '500 agendamentos/mês', 'AI Scribe, NF-e, Telemedicina'],
  ENTERPRISE: ['Usuários ilimitados', 'Pacientes ilimitados', 'Agendamentos ilimitados', 'Suporte prioritário'],
}

export default function AssinarPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [plan, setPlan] = useState<Plan>('PRO')
  const [cycle, setCycle] = useState<Cycle>('MONTHLY')
  const [method, setMethod] = useState<Method>('PIX')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [result, setResult] = useState<any>(null)

  const price =
    cycle === 'MONTHLY'
      ? PLAN_PRICES[plan].monthly / 100
      : Math.round(PLAN_PRICES[plan].annual / 12) / 100

  const { mutate, isPending, error } = useMutation({
    mutationFn: () =>
      billingApi.subscribe({
        plan,
        billingCycle: cycle,
        paymentMethod: method,
        cpfCnpj: cpfCnpj || undefined,
      }),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['billing-status'] })
    },
  })

  // Se pagamento confirmado (via polling), redirecionar para o dashboard
  if (result?.subscription?.status === 'ACTIVE' && !result?.payment?.pixQrCode && !result?.payment?.boletoUrl) {
    router.replace('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-full mb-4">
            <AlertCircle className="w-7 h-7 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Período de teste expirou
          </h1>
          <p className="text-gray-500">
            Assine para continuar usando o VetCare e manter todos os seus dados.
          </p>
        </div>

        {/* Se já tem resultado de PIX/boleto gerado */}
        {result?.payment && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">
              {method === 'PIX' ? '📱 QR Code PIX' : '📄 Boleto bancário'}
            </h2>

            {method === 'PIX' && result.payment.pixQrCode && (
              <div className="text-center">
                <img
                  src={`data:image/png;base64,${result.payment.pixQrCode}`}
                  alt="QR Code PIX"
                  className="w-48 h-48 mx-auto mb-4 rounded-lg border"
                />
                <p className="text-sm text-gray-500 mb-3">ou copie o código:</p>
                <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs break-all text-gray-700 mb-3">
                  {result.payment.pixCopiaECola}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(result.payment.pixCopiaECola)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Copiar código PIX
                </button>
              </div>
            )}

            {method === 'BOLETO' && (
              <div className="text-center">
                {result.payment.boletoUrl && (
                  <a
                    href={result.payment.boletoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 font-medium text-sm mb-3"
                  >
                    <FileText className="w-4 h-4" /> Abrir boleto
                  </a>
                )}
                {result.payment.boletoBarCode && (
                  <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs break-all text-gray-700">
                    {result.payment.boletoBarCode}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              O acesso será liberado automaticamente após a confirmação do pagamento.
            </div>
          </div>
        )}

        {/* Formulário de assinatura */}
        {!result && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            {/* Seleção de plano */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Escolha o plano</p>
              <div className="grid grid-cols-2 gap-3">
                {(['PRO', 'ENTERPRISE'] as Plan[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlan(p)}
                    className={`p-4 rounded-xl border-2 text-left transition-colors ${
                      plan === p
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {p === 'PRO' ? (
                        <Zap className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Building2 className="w-4 h-4 text-amber-600" />
                      )}
                      <span className="font-semibold text-sm text-gray-900">{p}</span>
                    </div>
                    <ul className="space-y-1">
                      {PLAN_FEATURES[p].map((f) => (
                        <li key={f} className="text-xs text-gray-500 flex items-start gap-1">
                          <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </div>

            {/* Ciclo de cobrança */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Ciclo de cobrança</p>
              <div className="flex gap-3">
                {(['MONTHLY', 'ANNUAL'] as Cycle[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCycle(c)}
                    className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      cycle === c
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {c === 'MONTHLY' ? 'Mensal' : (
                      <span className="flex items-center justify-center gap-1.5">
                        Anual
                        <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">
                          -20%
                        </span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Forma de pagamento */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Forma de pagamento</p>
              <div className="flex gap-3">
                {([
                  { key: 'PIX', label: 'PIX', icon: QrCode },
                  { key: 'BOLETO', label: 'Boleto', icon: FileText },
                  { key: 'CREDIT_CARD', label: 'Cartão', icon: CreditCard },
                ] as { key: Method; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setMethod(key)}
                    className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      method === key
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* CPF/CNPJ opcional */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                CPF ou CNPJ <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                placeholder="000.000.000-00 ou 00.000.000/0001-00"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Resumo do preço */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-baseline justify-between">
                <span className="text-gray-600 text-sm">{plan} — {cycle === 'MONTHLY' ? 'Mensal' : 'Anual'}</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">
                    R${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-gray-400 text-sm">/mês</span>
                  {cycle === 'ANNUAL' && (
                    <p className="text-xs text-green-600">
                      cobrado como R${(price * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                {(error as any)?.response?.data?.error ?? 'Erro ao processar assinatura. Tente novamente.'}
              </div>
            )}

            {/* Botão assinar */}
            <button
              onClick={() => mutate()}
              disabled={isPending}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                `Assinar ${plan} por R$${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
