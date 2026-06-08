'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Video, VideoOff, Clock, CheckCircle, XCircle, ExternalLink, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { teleconsultationApi } from '@/lib/api'
import { NewTeleconsultationDialog } from '@/components/teleconsultation/NewTeleconsultationDialog'

const STATUS_CONFIG = {
  WAITING:   { label: 'Aguardando', icon: Clock,        bg: 'bg-amber-50',  text: 'text-amber-700' },
  ACTIVE:    { label: 'Em andamento', icon: Video,      bg: 'bg-green-50',  text: 'text-green-700' },
  ENDED:     { label: 'Encerrada',  icon: CheckCircle,  bg: 'bg-gray-50',   text: 'text-gray-500'  },
  CANCELLED: { label: 'Cancelada',  icon: XCircle,      bg: 'bg-red-50',    text: 'text-red-600'   },
}

const SPECIES_EMOJI: Record<string, string> = {
  DOG: '🐕', CAT: '🐈', BIRD: '🐦', RABBIT: '🐇',
  HAMSTER: '🐹', REPTILE: '🦎', OTHER: '🐾',
}

export default function TelemedicinaPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['teleconsultation-list'],
    queryFn:  () => teleconsultationApi.list(),
  })

  const { data: statusData } = useQuery({
    queryKey: ['teleconsultation-status'],
    queryFn:  teleconsultationApi.status,
  })

  const joinMutation = useMutation({
    mutationFn: (id: string) => teleconsultationApi.join(id),
    onSuccess:  (data) => {
      window.open(data.url, '_blank')
    },
  })

  const endMutation = useMutation({
    mutationFn: (id: string) => teleconsultationApi.end(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['teleconsultation-list'] }),
  })

  const [newOpen, setNewOpen] = useState(false)
  const rooms = data?.data ?? []
  const active = rooms.filter((r: any) => ['WAITING', 'ACTIVE'].includes(r.status))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Telemedicina</h1>
          <p className="text-sm text-gray-500 mt-1">Teleconsultas veterinárias via vídeo</p>
        </div>
        <button
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Nova Teleconsulta
        </button>
      </div>

      {/* Status do serviço */}
      {statusData && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
          statusData.configured ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
        }`}>
          {statusData.configured
            ? <><CheckCircle className="w-5 h-5 text-green-600" /><p className="text-sm text-green-800">Daily.co configurado — salas reais ativas</p></>
            : <><VideoOff className="w-5 h-5 text-amber-600" /><p className="text-sm text-amber-800">Configure <code>DAILY_API_KEY</code> para salas reais. No momento, modo demonstração.</p></>
          }
        </div>
      )}

      {/* Sessões ativas */}
      {active.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">🔴 Sessões Ativas</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {active.map((room: any) => (
              <div key={room.id} className="bg-white rounded-2xl border-2 border-green-200 p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{SPECIES_EMOJI[room.patient.species] ?? '🐾'}</span>
                    <div>
                      <p className="font-bold text-gray-900">{room.patient.name}</p>
                      <p className="text-xs text-gray-500">Dr(a). {room.vet.name}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    {STATUS_CONFIG[room.status as keyof typeof STATUS_CONFIG]?.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {format(new Date(room.scheduledAt), "dd/MM/yyyy 'às' HH:mm")}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => joinMutation.mutate(room.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700"
                  >
                    <Video className="w-4 h-4" />
                    Entrar na Sala
                  </button>
                  <button
                    onClick={() => endMutation.mutate(room.id)}
                    className="px-3 py-2 text-sm text-red-600 bg-red-50 rounded-xl hover:bg-red-100"
                  >
                    Encerrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Histórico</h2>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Video className="w-12 h-12 mb-3 opacity-40" />
            <p>Nenhuma teleconsulta ainda</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Paciente', 'Veterinário', 'Agendada', 'Duração', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rooms.map((room: any) => {
                  const cfg  = STATUS_CONFIG[room.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.ENDED
                  const Icon = cfg.icon
                  const duration = room.startedAt && room.endedAt
                    ? Math.round((new Date(room.endedAt).getTime() - new Date(room.startedAt).getTime()) / 60_000)
                    : null

                  return (
                    <tr key={room.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="mr-1">{SPECIES_EMOJI[room.patient.species] ?? '🐾'}</span>
                        <span className="font-medium text-gray-900">{room.patient.name}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{room.vet.name}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {format(new Date(room.scheduledAt), 'dd/MM/yy HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {duration != null ? `${duration} min` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${cfg.bg} ${cfg.text}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewTeleconsultationDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}
