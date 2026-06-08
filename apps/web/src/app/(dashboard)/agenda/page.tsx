'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { appointmentsApi } from '@/lib/api'
import { APPOINTMENT_TYPE_LABELS, APPOINTMENT_STATUS_LABELS, STATUS_COLORS, SPECIES_EMOJIS } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NewAppointmentDialog } from '@/components/appointments/NewAppointmentDialog'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7) // 7h to 18h

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [newOpen, setNewOpen] = useState(false)
  const qc = useQueryClient()

  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const { data } = useQuery({
    queryKey: ['appointments', dateStr],
    queryFn: () => appointmentsApi.list({ date: dateStr, pageSize: 100 }),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      appointmentsApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })

  const appointments = data?.data ?? []

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <button
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>
      </div>

      {/* Week picker */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setSelectedDate(d => subDays(d, 7))} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {format(weekStart, "dd 'de' MMMM", { locale: ptBR })} — {format(addDays(weekStart, 6), "dd 'de' MMMM", { locale: ptBR })}
          </span>
          <button onClick={() => setSelectedDate(d => addDays(d, 7))} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate)
            const isToday = isSameDay(day, new Date())
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'flex flex-col items-center py-2 rounded-xl transition',
                  isSelected ? 'bg-primary text-white' : 'hover:bg-gray-50 text-gray-600',
                  isToday && !isSelected && 'font-bold text-primary'
                )}
              >
                <span className="text-xs">{format(day, 'EEE', { locale: ptBR })}</span>
                <span className="text-base font-semibold mt-0.5">{format(day, 'd')}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Appointments list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {appointments.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-sm">Nenhum agendamento para este dia</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {appointments.map((appt: any) => (
              <div key={appt.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition">
                <div className="text-2xl w-10 text-center">
                  {SPECIES_EMOJIS[appt.patient?.species] || '🐾'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{appt.patient?.name}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[appt.status])}>
                      {APPOINTMENT_STATUS_LABELS[appt.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {APPOINTMENT_TYPE_LABELS[appt.type]} · Dr(a). {appt.vet?.name}
                  </p>
                  {appt.notes && <p className="text-xs text-gray-400 mt-0.5">{appt.notes}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-medium text-gray-700">
                    {new Date(appt.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-gray-400">{appt.duration} min</p>
                </div>
                {/* Transições permitidas pela máquina de estados */}
                {(() => {
                  const NEXT: Record<string, { value: string; label: string }[]> = {
                    SCHEDULED:   [
                      { value: 'CONFIRMED',   label: 'Confirmar' },
                      { value: 'IN_PROGRESS', label: 'Iniciar' },
                      { value: 'NO_SHOW',     label: 'Não compareceu' },
                      { value: 'CANCELLED',   label: 'Cancelar' },
                    ],
                    CONFIRMED:   [
                      { value: 'IN_PROGRESS', label: 'Iniciar' },
                      { value: 'NO_SHOW',     label: 'Não compareceu' },
                      { value: 'CANCELLED',   label: 'Cancelar' },
                    ],
                    IN_PROGRESS: [
                      { value: 'COMPLETED',   label: 'Concluir' },
                      { value: 'CANCELLED',   label: 'Cancelar' },
                    ],
                  }
                  const options = NEXT[appt.status]
                  if (!options) return null
                  return (
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) updateStatus.mutate({ id: appt.id, status: e.target.value })
                      }}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Ação...</option>
                      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  )
                })()}
              </div>
            ))}
          </div>
        )}
      </div>

      <NewAppointmentDialog open={newOpen} onClose={() => setNewOpen(false)} defaultDate={selectedDate} />
    </div>
  )
}
