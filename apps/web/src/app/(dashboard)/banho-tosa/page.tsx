'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Scissors, Plus, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { groomingApi } from '@/lib/api'
import { NewGroomingPackageDialog } from '@/components/grooming/NewGroomingPackageDialog'

const SPECIES_EMOJI: Record<string, string> = {
  DOG: '🐕', CAT: '🐈', BIRD: '🐦', RABBIT: '🐇',
  HAMSTER: '🐹', REPTILE: '🦎', OTHER: '🐾',
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export default function BanhoTosaPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'active' | 'all'>('active')
  const [newOpen, setNewOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['grooming-packages', filter],
    queryFn:  () => groomingApi.packages({ active: filter === 'active' }),
  })

  const useMutation_ = useMutation({
    mutationFn: (id: string) => groomingApi.useSession(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['grooming-packages'] }),
  })

  const packages = data?.data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banho & Tosa</h1>
          <p className="text-sm text-gray-500 mt-1">Pacotes de sessões pré-pagos</p>
        </div>
        <button
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Novo Pacote
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['active', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f === 'active' ? 'Pacotes Ativos' : 'Todos'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Scissors className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-base font-medium">Nenhum pacote encontrado</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {packages.map((pkg: any) => {
            const remaining = pkg.totalSessions - pkg.usedSessions
            const pct       = (pkg.usedSessions / pkg.totalSessions) * 100
            const expired   = pkg.validUntil && new Date(pkg.validUntil) < new Date()

            return (
              <div key={pkg.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                {/* Animal */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{SPECIES_EMOJI[pkg.patient.species] ?? '🐾'}</span>
                    <div>
                      <p className="font-bold text-gray-900">{pkg.patient.name}</p>
                      <p className="text-xs text-gray-400">{pkg.patient.breed}</p>
                    </div>
                  </div>
                  {expired && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Vencido
                    </span>
                  )}
                </div>

                {/* Pacote info */}
                <div>
                  <p className="text-sm font-semibold text-gray-800">{pkg.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmt(pkg.price)}</p>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{pkg.usedSessions} usadas</span>
                    <span>{remaining} restantes</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 90 ? 'bg-red-400' : pct >= 60 ? 'bg-amber-400' : 'bg-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-right mt-0.5">{pkg.totalSessions} total</p>
                </div>

                {/* Validade */}
                {pkg.validUntil && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    Válido até {format(new Date(pkg.validUntil), 'dd/MM/yyyy')}
                  </div>
                )}

                {/* Ação */}
                <button
                  onClick={() => useMutation_.mutate(pkg.id)}
                  disabled={remaining <= 0 || expired || useMutation_.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  Usar 1 Sessão
                </button>
              </div>
            )
          })}
        </div>
      )}

      <NewGroomingPackageDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}
