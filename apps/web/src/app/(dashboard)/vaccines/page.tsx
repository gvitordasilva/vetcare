'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { vaccinesApi } from '@/lib/api'
import { formatDate, SPECIES_EMOJIS } from '@/lib/utils'
import { Search, Plus, Syringe, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NewVaccineDialog } from '@/components/vaccines/NewVaccineDialog'

export default function VaccinesPage() {
  const [search, setSearch] = useState('')
  const [dueSoon, setDueSoon] = useState(false)
  const [newOpen, setNewOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['vaccines', dueSoon, search],
    queryFn: () => vaccinesApi.list({
      dueSoon: dueSoon || undefined,
      search:  search || undefined,
      pageSize: 50,
    }),
  })

  const today = new Date()
  const vaccines = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vacinas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Carteira de vacinação dos pacientes</p>
        </div>
        <button
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Registrar Vacina
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por vacina ou animal..."
          className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex gap-3">
        <button
          onClick={() => setDueSoon(false)}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium transition border',
            !dueSoon ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          )}
        >
          Todas
        </button>
        <button
          onClick={() => setDueSoon(true)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition border',
            dueSoon ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Vencendo em 30 dias
        </button>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : vaccines.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
          <Syringe className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma vacina encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vaccines.map((v: any) => {
            const daysUntil = v.nextDoseAt
              ? Math.ceil((new Date(v.nextDoseAt).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              : null
            const isOverdue = daysUntil !== null && daysUntil < 0
            const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 30

            return (
              <div
                key={v.id}
                className={cn(
                  'bg-white rounded-2xl border shadow-sm p-5 transition',
                  isOverdue ? 'border-red-200' : isDueSoon ? 'border-orange-200' : 'border-gray-100'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{SPECIES_EMOJIS[v.patient?.species] || '🐾'}</span>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{v.patient?.name}</p>
                    </div>
                  </div>
                  {isOverdue && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Vencida</span>
                  )}
                  {isDueSoon && !isOverdue && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                      {daysUntil}d
                    </span>
                  )}
                </div>
                <p className="font-medium text-gray-900">{v.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">Dose: {v.dose}</p>
                {v.manufacturer && <p className="text-xs text-gray-400">Fabricante: {v.manufacturer}</p>}
                {v.lot && <p className="text-xs text-gray-400">Lote: {v.lot}</p>}
                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                  <span>Aplicada: {formatDate(v.appliedAt)}</span>
                  {v.nextDoseAt && (
                    <span className={cn(isOverdue ? 'text-red-500 font-medium' : isDueSoon ? 'text-orange-500 font-medium' : '')}>
                      Próxima: {formatDate(v.nextDoseAt)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <NewVaccineDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}
