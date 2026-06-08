'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BedDouble, AlertTriangle, Clock, Thermometer, Heart, Plus, RefreshCw } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { hospitalizationsApi } from '@/lib/api'
import { NewHospitalizationDialog } from '@/components/hospitalizations/NewHospitalizationDialog'

const SEVERITY_CONFIG = {
  LOW:      { label: 'Baixa',    bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500' },
  MEDIUM:   { label: 'Média',    bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500' },
  HIGH:     { label: 'Alta',     bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  CRITICAL: { label: 'Crítica', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500 animate-pulse' },
}

const STATUS_LABELS: Record<string, string> = {
  ADMITTED:    'Internado',
  OBSERVATION: 'Observação',
  DISCHARGED:  'Alta',
  TRANSFERRED: 'Transferido',
}

const SPECIES_EMOJI: Record<string, string> = {
  DOG: '🐕', CAT: '🐈', BIRD: '🐦', RABBIT: '🐇',
  HAMSTER: '🐹', REPTILE: '🦎', OTHER: '🐾',
}

export default function InternacoesPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'whiteboard' | 'history'>('whiteboard')
  const [newOpen, setNewOpen] = useState(false)

  const { data: whiteboard = [], isLoading, refetch } = useQuery({
    queryKey: ['hospitalizations-whiteboard'],
    queryFn:  hospitalizationsApi.whiteboard,
    refetchInterval: 60_000, // auto-refresh a cada minuto
  })

  const { data: history } = useQuery({
    queryKey: ['hospitalizations-history'],
    queryFn:  () => hospitalizationsApi.list({ status: 'DISCHARGED' }),
    enabled:  tab === 'history',
  })

  const dischargeMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      hospitalizationsApi.updateStatus(id, 'DISCHARGED'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hospitalizations-whiteboard'] }),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Internação</h1>
          <p className="text-sm text-gray-500 mt-1">
            {whiteboard.length} animal(is) internado(s) agora
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Nova Internação
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['whiteboard', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'whiteboard' ? 'Internados Agora' : 'Histórico de Altas'}
          </button>
        ))}
      </div>

      {tab === 'whiteboard' && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : whiteboard.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <BedDouble className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-base font-medium">Nenhum animal internado</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {whiteboard.map((h: any) => {
                const sev = SEVERITY_CONFIG[h.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.MEDIUM
                const lastEvol = h.evolutions?.[0]
                const admittedAgo = formatDistanceToNow(new Date(h.admittedAt), { locale: ptBR, addSuffix: true })

                return (
                  <div key={h.id} className={`bg-white rounded-2xl border-2 ${sev.border} p-5 space-y-4`}>
                    {/* Animal header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{SPECIES_EMOJI[h.patient.species] ?? '🐾'}</div>
                        <div>
                          <p className="font-bold text-gray-900">{h.patient.name}</p>
                          <p className="text-xs text-gray-500">{h.patient.species}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sev.bg} ${sev.text}`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${sev.dot} mr-1`} />
                          {sev.label}
                        </span>
                        {h.room && (
                          <span className="text-xs text-gray-400">{h.room}</span>
                        )}
                      </div>
                    </div>

                    {/* Motivo */}
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Motivo</p>
                      <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{h.reason}</p>
                    </div>

                    {/* Alergias */}
                    {h.patient.allergies && (
                      <div className="flex items-start gap-2 bg-red-50 rounded-lg p-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">
                          <strong>Alergias:</strong> {h.patient.allergies}
                        </p>
                      </div>
                    )}

                    {/* Última evolução */}
                    {lastEvol && (
                      <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                        <p className="text-xs text-gray-400 font-medium">Última evolução</p>
                        <div className="flex gap-4 text-xs text-gray-600">
                          {lastEvol.temperature && (
                            <span className="flex items-center gap-1">
                              <Thermometer className="w-3 h-3" />
                              {lastEvol.temperature}°C
                            </span>
                          )}
                          {lastEvol.heartRate && (
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {lastEvol.heartRate} bpm
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">{lastEvol.description}</p>
                      </div>
                    )}

                    {/* Prescrições ativas */}
                    {h.prescriptions?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-1">Medicações ativas</p>
                        <div className="space-y-1">
                          {h.prescriptions.slice(0, 3).map((p: any) => (
                            <div key={p.id} className="text-xs bg-blue-50 text-blue-800 rounded-lg px-2 py-1">
                              {p.medication} — {p.dosage} {p.route && `(${p.route})`}
                            </div>
                          ))}
                          {h.prescriptions.length > 3 && (
                            <p className="text-xs text-gray-400">+{h.prescriptions.length - 3} mais</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {admittedAgo}
                        </p>
                        <p className="text-xs text-gray-500">Dr(a). {h.responsibleVet.name}</p>
                      </div>
                      <button
                        onClick={() => dischargeMutation.mutate({ id: h.id })}
                        className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                      >
                        Dar Alta
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Paciente', 'Motivo', 'Vet Resp.', 'Admissão', 'Alta', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history?.data?.map((h: any) => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{h.patient.name}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{h.reason}</td>
                  <td className="px-4 py-3 text-gray-600">{h.responsibleVet.name}</td>
                  <td className="px-4 py-3 text-gray-500">{format(new Date(h.admittedAt), 'dd/MM/yy HH:mm')}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {h.dischargedAt ? format(new Date(h.dischargedAt), 'dd/MM/yy HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      {STATUS_LABELS[h.status] ?? h.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewHospitalizationDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}
