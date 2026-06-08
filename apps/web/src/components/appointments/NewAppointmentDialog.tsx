'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { appointmentsApi, patientsApi, tenantApi } from '@/lib/api'
import { format } from 'date-fns'
import { X, Loader2 } from 'lucide-react'

const schema = z.object({
  patientId: z.string().min(1, 'Selecione um paciente'),
  vetId: z.string().min(1, 'Selecione um veterinário'),
  scheduledAt: z.string().min(1, 'Data obrigatória'),
  scheduledTime: z.string().min(1, 'Hora obrigatória'),
  duration: z.coerce.number().int().min(15).default(30),
  type: z.enum(['CONSULTATION', 'RETURN', 'VACCINE', 'SURGERY', 'EXAM', 'GROOMING', 'EMERGENCY']),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function NewAppointmentDialog({ open, onClose, defaultDate }: { open: boolean; onClose: () => void; defaultDate?: Date }) {
  const qc = useQueryClient()

  const { data: patientsData } = useQuery({ queryKey: ['patients-all'], queryFn: () => patientsApi.list({ pageSize: 200 }) })
  const { data: users } = useQuery({ queryKey: ['tenant-users'], queryFn: tenantApi.users })
  const vets = users?.filter((u: any) => ['VET', 'OWNER', 'ADMIN'].includes(u.role)) ?? []

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'CONSULTATION',
      duration: 30,
      scheduledAt: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const scheduledAt = new Date(`${data.scheduledAt}T${data.scheduledTime}:00`).toISOString()
      return appointmentsApi.create({ ...data, scheduledAt })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      reset()
      onClose()
    },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Novo Agendamento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Paciente *</label>
            <select {...register('patientId')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">Selecione...</option>
              {patientsData?.data?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.owner?.name})</option>
              ))}
            </select>
            {errors.patientId && <p className="text-red-500 text-xs mt-1">{errors.patientId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Veterinário *</label>
            <select {...register('vetId')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">Selecione...</option>
              {vets.map((v: any) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            {errors.vetId && <p className="text-red-500 text-xs mt-1">{errors.vetId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Data *</label>
              <input {...register('scheduledAt')} type="date" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
              {errors.scheduledAt && <p className="text-red-500 text-xs mt-1">{errors.scheduledAt.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Horário *</label>
              <input {...register('scheduledTime')} type="time" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
              {errors.scheduledTime && <p className="text-red-500 text-xs mt-1">{errors.scheduledTime.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo *</label>
              <select {...register('type')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="CONSULTATION">Consulta</option>
                <option value="RETURN">Retorno</option>
                <option value="VACCINE">Vacinação</option>
                <option value="SURGERY">Cirurgia</option>
                <option value="EXAM">Exame</option>
                <option value="GROOMING">Banho/Tosa</option>
                <option value="EMERGENCY">Emergência</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Duração (min)</label>
              <input {...register('duration')} type="number" min={15} max={240} step={15} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea {...register('notes')} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
          </div>

          {mutation.error && (
            <p className="text-red-500 text-sm">{(mutation.error as any).response?.data?.error || 'Erro ao salvar'}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 bg-primary text-white py-2.5 rounded-xl font-medium hover:bg-primary/90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
