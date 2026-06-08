'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, TrendingUp, Users, ChevronLeft, ChevronRight, Pencil, Check } from 'lucide-react'
import { reportsApi, commissionApi } from '@/lib/api'

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function ComissoesPage() {
  const qc = useQueryClient()
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [editing, setEditing] = useState<Record<string, string>>({})

  const { data: summary, isLoading } = useQuery({
    queryKey: ['commissions-summary', year, month],
    queryFn:  () => commissionApi.summary(year, month),
  })

  const { data: vets } = useQuery({
    queryKey: ['commissions-vets'],
    queryFn:  commissionApi.vets,
  })

  const saveMutation = useMutation({
    mutationFn: ({ vetId, rate }: { vetId: string; rate: number }) =>
      commissionApi.setRate(vetId, rate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commissions-summary'] })
      qc.invalidateQueries({ queryKey: ['commissions-vets'] })
      setEditing({})
    },
  })

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comissões</h1>
          <p className="text-sm text-gray-500 mt-1">Acompanhe a produção e comissão dos veterinários</p>
        </div>

        {/* Month/Year selector */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="font-semibold text-gray-900 w-28 text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Totais */}
      {!isLoading && summary && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">Receita Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(summary.totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">Total Comissões</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{fmt(summary.totalCommission)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm col-span-2 lg:col-span-1">
            <p className="text-sm text-gray-500">Veterinários com comissão</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {summary.summary?.filter((v: any) => v.commissionRate > 0).length ?? 0}
            </p>
          </div>
        </div>
      )}

      {/* Tabela por vet */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Produção por Veterinário</h2>
          <p className="text-xs text-gray-400 mt-0.5">Clique no % para editar a taxa de comissão</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Veterinário', 'Consultas', 'Receita', 'Taxa %', 'Comissão'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {summary?.summary?.map((vet: any) => (
                <tr key={vet.vetId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{vet.vetName}</td>
                  <td className="px-4 py-3 text-gray-600">{vet.consultationCount}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{fmt(vet.revenue)}</td>
                  <td className="px-4 py-3">
                    {editing[vet.vetId] !== undefined ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min="0" max="100" step="0.5"
                          value={editing[vet.vetId]}
                          onChange={e => setEditing(prev => ({ ...prev, [vet.vetId]: e.target.value }))}
                          className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                        />
                        <span className="text-gray-400">%</span>
                        <button
                          onClick={() => saveMutation.mutate({ vetId: vet.vetId, rate: Number(editing[vet.vetId]) })}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditing(prev => ({ ...prev, [vet.vetId]: String(vet.commissionRate) }))}
                        className="flex items-center gap-1 text-primary hover:underline font-medium"
                      >
                        {vet.commissionRate}%
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-green-700 font-semibold">{fmt(vet.commissionAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
