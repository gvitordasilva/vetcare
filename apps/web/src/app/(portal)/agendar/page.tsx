'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Clock, PawPrint, User, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import { format, addDays, startOfDay, isBefore } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { portalApi } from '@/lib/portal-api'

const TYPE_LABELS: Record<string, string> = {
  CONSULTATION: 'Consulta',
  RETURN:       'Retorno',
  VACCINE:      'Vacinação',
  EXAM:         'Exame',
  GROOMING:     'Banho e Tosa',
}

export default function AgendarPage() {
  const qc = useQueryClient()
  const [step, setStep]         = useState<'pet' | 'vet' | 'date' | 'slot' | 'confirm' | 'done'>('pet')
  const [selectedPet,  setSelectedPet]  = useState<any>(null)
  const [selectedVet,  setSelectedVet]  = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [type, setType]                 = useState('CONSULTATION')
  const [notes, setNotes]               = useState('')

  // Gera os próximos 14 dias disponíveis (excluindo domingos)
  const availableDates = Array.from({ length: 21 }, (_, i) => addDays(new Date(), i + 1))
    .filter(d => d.getDay() !== 0)
    .slice(0, 14)

  const { data: pets = [] } = useQuery({
    queryKey: ['portal-pets'],
    queryFn:  () => portalApi.get('/pets').then(r => r.data),
  })

  const { data: vets = [] } = useQuery({
    queryKey: ['portal-vets'],
    queryFn:  () => portalApi.get('/booking/vets').then(r => r.data),
    enabled:  step !== 'pet',
  })

  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''
  const { data: slots = [] } = useQuery({
    queryKey: ['portal-slots', selectedVet?.id, dateStr],
    queryFn:  () => portalApi.get('/booking/slots', { params: { vetId: selectedVet?.id, date: dateStr } }).then(r => r.data),
    enabled:  !!selectedVet && !!selectedDate,
  })

  const bookMutation = useMutation({
    mutationFn: () => portalApi.post('/booking/appointments', {
      patientId:   selectedPet?.id,
      vetId:       selectedVet?.id,
      scheduledAt: selectedSlot,
      type,
      notes: notes || undefined,
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-pets'] })
      setStep('done')
    },
  })

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Consulta agendada!</h2>
        <p className="text-sm text-gray-500 text-center">
          {selectedPet?.name} com Dr(a). {selectedVet?.name}<br />
          {selectedSlot && format(new Date(selectedSlot), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
        </p>
        <button
          onClick={() => { setStep('pet'); setSelectedPet(null); setSelectedVet(null); setSelectedDate(null); setSelectedSlot(null) }}
          className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90"
        >
          Agendar outra consulta
        </button>
      </div>
    )
  }

  const STEPS = ['pet', 'vet', 'date', 'slot', 'confirm']
  const stepIdx = STEPS.indexOf(step)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agendar Consulta</h1>
        <p className="text-sm text-gray-500 mt-1">Escolha o pet, veterinário e horário</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2">
        {['Pet', 'Vet', 'Data', 'Horário', 'Confirmar'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${i < stepIdx ? 'bg-primary text-white' : i === stepIdx ? 'bg-primary text-white ring-2 ring-primary/30' : 'bg-gray-100 text-gray-400'}`}>
              {i < stepIdx ? '✓' : i + 1}
            </div>
            {i < 4 && <div className={`h-0.5 w-8 ${i < stepIdx ? 'bg-primary' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Selecionar Pet */}
      {step === 'pet' && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">Qual é o pet?</h2>
          {pets.map((pet: any) => (
            <button
              key={pet.id}
              onClick={() => { setSelectedPet(pet); setStep('vet') }}
              className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-primary/40 hover:bg-primary/5 transition text-left"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-2xl">
                {pet.photoUrl ? <img src={pet.photoUrl} className="w-full h-full object-cover rounded-xl" /> : '🐾'}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{pet.name}</p>
                <p className="text-sm text-gray-500">{pet.species} — {pet.breed}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Selecionar Veterinário */}
      {step === 'vet' && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">Escolha o veterinário</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de consulta</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          {vets.map((vet: any) => (
            <button
              key={vet.id}
              onClick={() => { setSelectedVet(vet); setStep('date') }}
              className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-primary/40 hover:bg-primary/5 transition text-left"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{vet.name}</p>
                <p className="text-sm text-gray-500">Médico(a) Veterinário(a)</p>
              </div>
            </button>
          ))}
          <button onClick={() => setStep('pet')} className="text-sm text-gray-500 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      )}

      {/* Step 3: Selecionar Data */}
      {step === 'date' && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">Escolha a data</h2>
          <div className="grid grid-cols-2 gap-2">
            {availableDates.map(date => (
              <button
                key={date.toISOString()}
                onClick={() => { setSelectedDate(date); setStep('slot') }}
                className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-primary/40 hover:bg-primary/5 transition text-left"
              >
                <p className="font-semibold text-gray-900">{format(date, 'dd/MM/yyyy')}</p>
                <p className="text-xs text-gray-500 capitalize">{format(date, 'EEEE', { locale: ptBR })}</p>
              </button>
            ))}
          </div>
          <button onClick={() => setStep('vet')} className="text-sm text-gray-500 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      )}

      {/* Step 4: Selecionar Horário */}
      {step === 'slot' && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">
            Horários disponíveis — {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </h2>
          {slots.length === 0 ? (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4 text-center">
              Nenhum horário disponível nesta data. Tente outro dia.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot: any) => (
                <button
                  key={slot.time}
                  onClick={() => { setSelectedSlot(slot.time); setStep('confirm') }}
                  className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-primary hover:bg-primary/5 transition text-center font-semibold text-gray-900"
                >
                  {slot.label}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setStep('date')} className="text-sm text-gray-500 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      )}

      {/* Step 5: Confirmar */}
      {step === 'confirm' && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Confirmar agendamento</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pet</span>
              <span className="font-medium text-gray-900">{selectedPet?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tipo</span>
              <span className="font-medium text-gray-900">{TYPE_LABELS[type]}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Veterinário</span>
              <span className="font-medium text-gray-900">Dr(a). {selectedVet?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Data e hora</span>
              <span className="font-medium text-gray-900">
                {selectedSlot && format(new Date(selectedSlot), "dd/MM/yyyy 'às' HH:mm")}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações (opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Descreva o motivo da consulta, sintomas, etc."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <button
            onClick={() => bookMutation.mutate()}
            disabled={bookMutation.isPending}
            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-60"
          >
            {bookMutation.isPending ? 'Agendando...' : 'Confirmar Agendamento'}
          </button>
          {bookMutation.isError && (
            <p className="text-sm text-red-600 text-center">
              {(bookMutation.error as any)?.response?.data?.error ?? 'Erro ao agendar. Tente novamente.'}
            </p>
          )}
          <button onClick={() => setStep('slot')} className="w-full text-sm text-gray-500 flex items-center justify-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      )}
    </div>
  )
}
