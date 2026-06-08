'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { teleconsultationApi, patientsApi, tenantApi } from '@/lib/api'
import { X, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

const schema = z.object({
  patientId:   z.string().min(1, 'Selecione um paciente'),
  vetId:       z.string().min(1, 'Selecione um veterinário'),
  scheduledAt: z.string().min(1, 'Data obrigatória'),
  scheduledTime: z.string().min(1, 'Horário obrigatório'),
})

type FormData = z.infer<typeof schema>

export function NewTeleconsultationDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()

  const { data: patientsData } = useQuery({
    queryKey: ['patients-all'],
    queryFn: () => patientsApi.list({ pageSize: 500 }),
  })

  const { data: users } = useQuery({
    queryKey: ['tenant-users'],
    queryFn: tenantApi.users,
  })
  const vets = users?.filter((u: any) => ['VET', 'OWNER', 'ADMIN'].includes(u.role)) ?? []

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      scheduledAt: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const mutation = useMutation({
    mutationFn: (d: FormData) =>
      teleconsultationApi.create({
        patientId:   d.patientId,
        vetId:       d.vetId,
        scheduledAt: new Date(`${d.scheduledAt}T${d.scheduledTime}:00`).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teleconsultation-list'] })
      reset()
      onClose()
    },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Nova Teleconsulta</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Paciente *</label>
            <select
              {...register('patientId')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
            >
              <option value="">Selecione o paciente...</option>
              {patientsData?.data?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} · {p.owner?.name}</option>
              ))}
            </select>
            {errors.patientId && <p className="text-red-500 text-xs mt-1">{errors.patientId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Veterinário *</label>
            <select
              {...register('vetId')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
            >
              <option value="">Selecione o veterinário...</option>
              {vets.map((v: any) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            {errors.vetId && <p className="text-red-500 text-xs mt-1">{errors.vetId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Data *</label>
              <input
                {...register('scheduledAt')}
                type="date"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {errors.scheduledAt && <p className="text-red-500 text-xs mt-1">{errors.scheduledAt.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Horário *</label>
              <input
                {...register('scheduledTime')}
                type="time"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {errors.scheduledTime && <p className="text-red-500 text-xs mt-1">{errors.scheduledTime.message}</p>}
            </div>
          </div>

          {mutation.error && (
            <p className="text-red-500 text-sm">
              {(mutation.error as any).response?.data?.error || 'Erro ao criar teleconsulta'}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 bg-primary text-white py-2.5 rounded-xl font-medium hover:bg-primary/90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {mutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</>
                : 'Criar Teleconsulta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
