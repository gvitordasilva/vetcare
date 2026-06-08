'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoicesApi } from '@/lib/api'
import { formatCurrency, formatDate, STATUS_COLORS, INVOICE_STATUS_LABELS } from '@/lib/utils'
import { Plus, DollarSign, TrendingUp, Clock, AlertCircle, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NewInvoiceDialog } from '@/components/invoices/NewInvoiceDialog'

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Dinheiro', CREDIT: 'Crédito', DEBIT: 'Débito', PIX: 'PIX', TRANSFER: 'Transferência',
}

const FILTER_OPTIONS = [
  { value: '',         label: 'Todos' },
  { value: 'PENDING',  label: 'Pendentes' },
  { value: 'OVERDUE',  label: 'Vencidos' },
  { value: 'PAID',     label: 'Pagos' },
  { value: 'CANCELLED',label: 'Cancelados' },
]

export default function FinanceiroPage() {
  const [status, setStatus] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('PIX')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', status],
    queryFn: () => invoicesApi.list({ status: status || undefined, pageSize: 50 }),
  })

  const pay = useMutation({
    mutationFn: ({ id, method }: { id: string; method: string }) => invoicesApi.pay(id, method),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setPayingId(null)
    },
  })

  const cancel = useMutation({
    mutationFn: (id: string) => invoicesApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setCancelingId(null)
    },
  })

  const invoices = data?.data ?? []

  // Cards usam contadores separados sempre do total (sem filtro de status)
  const pending = invoices.filter((i: any) => i.status === 'PENDING')
  const overdue = invoices.filter((i: any) => i.status === 'OVERDUE')
  const pendingTotal = pending.reduce((s: number, i: any) => s + i.total, 0)
  const overdueTotal = overdue.reduce((s: number, i: any) => s + i.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-sm text-gray-500 mt-0.5">Controle de cobranças e pagamentos</p>
        </div>
        <button
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Cobrança
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Pendente</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(pendingTotal)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Inadimplente</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(overdueTotal)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total de cobranças</p>
              <p className="text-xl font-bold text-gray-900">{invoices.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-sm font-medium transition border',
              status === opt.value
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-sm">Nenhuma cobrança encontrada</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase">Tutor / Paciente</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Data</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-500">#{inv.number}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{inv.owner?.name}</p>
                    {inv.patient && <p className="text-xs text-gray-400">{inv.patient.name}</p>}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-sm text-gray-500">{formatDate(inv.createdAt)}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(inv.total)}</td>
                  <td className="px-6 py-4">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600')}>
                      {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                    {inv.status === 'PAID' && inv.paymentMethod && (
                      <span className="ml-2 text-xs text-gray-400">{PAYMENT_LABELS[inv.paymentMethod]}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {/* Registrar pagamento */}
                      {['PENDING', 'OVERDUE'].includes(inv.status) && (
                        payingId === inv.id ? (
                          <>
                            <select
                              value={paymentMethod}
                              onChange={e => setPaymentMethod(e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1"
                            >
                              {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => pay.mutate({ id: inv.id, method: paymentMethod })}
                              className="text-xs bg-primary text-white px-3 py-1 rounded-lg hover:bg-primary/90 transition"
                            >
                              Confirmar
                            </button>
                            <button onClick={() => setPayingId(null)} className="text-xs text-gray-400">×</button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setPayingId(inv.id); setCancelingId(null) }}
                            className="text-sm text-primary font-medium hover:underline"
                          >
                            Pagar
                          </button>
                        )
                      )}

                      {/* Cancelar cobrança */}
                      {['PENDING', 'OVERDUE'].includes(inv.status) && (
                        cancelingId === inv.id ? (
                          <>
                            <button
                              onClick={() => cancel.mutate(inv.id)}
                              disabled={cancel.isPending}
                              className="text-xs bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition disabled:opacity-60"
                            >
                              Confirmar cancelamento
                            </button>
                            <button onClick={() => setCancelingId(null)} className="text-xs text-gray-400">×</button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setCancelingId(inv.id); setPayingId(null) }}
                            className="text-xs text-red-400 hover:text-red-600 transition"
                            title="Cancelar cobrança"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <NewInvoiceDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}
