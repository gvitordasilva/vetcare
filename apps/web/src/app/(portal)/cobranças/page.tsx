'use client'

import { useQuery } from '@tanstack/react-query'
import { DollarSign, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { portalInvoicesApi } from '@/lib/portal-api'

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const STATUS_CONFIG = {
  PENDING:   { label: 'Pendente',  icon: Clock,         bg: 'bg-amber-50',  text: 'text-amber-700' },
  OVERDUE:   { label: 'Vencida',   icon: AlertCircle,   bg: 'bg-red-50',    text: 'text-red-700'   },
  PAID:      { label: 'Paga',      icon: CheckCircle,   bg: 'bg-green-50',  text: 'text-green-700' },
  CANCELLED: { label: 'Cancelada', icon: DollarSign,    bg: 'bg-gray-50',   text: 'text-gray-500'  },
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Dinheiro', CREDIT: 'Crédito', DEBIT: 'Débito', PIX: 'PIX', TRANSFER: 'Transferência',
}

export default function CobrancasPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['portal-invoices'],
    queryFn:  () => portalInvoicesApi.list({ pageSize: 50 }),
  })

  const invoices = data?.data ?? []
  const totalOpen = invoices
    .filter((i: any) => ['PENDING', 'OVERDUE'].includes(i.status))
    .reduce((s: number, i: any) => s + i.total, 0)

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cobranças</h1>
        {totalOpen > 0 && (
          <p className="text-sm text-amber-600 font-medium mt-1">
            ⚠️ Total em aberto: {fmt(totalOpen)}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <DollarSign className="w-12 h-12 mb-3 opacity-40" />
          <p>Nenhuma cobrança encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv: any) => {
            const cfg = STATUS_CONFIG[inv.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING
            const Icon = cfg.icon
            return (
              <div key={inv.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Nº {inv.number}</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">{fmt(inv.total)}</p>
                    {inv.patient && (
                      <p className="text-sm text-gray-500 mt-0.5">🐾 {inv.patient.name}</p>
                    )}
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {cfg.label}
                  </span>
                </div>

                {/* Itens */}
                <div className="mt-3 space-y-1 border-t border-gray-50 pt-3">
                  {inv.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{item.description}</span>
                      <span className="text-gray-800 font-medium">{fmt(item.total)}</span>
                    </div>
                  ))}
                  {inv.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Desconto</span>
                      <span>− {fmt(inv.discount)}</span>
                    </div>
                  )}
                </div>

                {/* Rodapé */}
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400 border-t border-gray-50 pt-3">
                  <span>{format(new Date(inv.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                  {inv.status === 'PAID' && inv.paidAt && (
                    <span className="text-green-600">
                      Pago {inv.paymentMethod && `via ${PAYMENT_LABELS[inv.paymentMethod]}`} em {format(new Date(inv.paidAt), 'dd/MM/yyyy')}
                    </span>
                  )}
                  {inv.dueDate && inv.status === 'PENDING' && (
                    <span className="text-amber-600">
                      Vence em {format(new Date(inv.dueDate), 'dd/MM/yyyy')}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
