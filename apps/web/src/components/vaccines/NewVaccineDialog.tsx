'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { vaccinesApi, patientsApi, tenantApi } from '@/lib/api'
import { format } from 'date-fns'
import { X, Loader2 } from 'lucide-react'

const schema = z.object({
  patientId: z.string().min(1),
  vetId: z.string().min(1),
  name: z.string().min(1),
  manufacturer: z.string().optional(),
  lot: z.string().optional(),
  dose: z.string().min(1),
  appliedAt: z.string().min(1),
  nextDoseAt: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const COMMON_VACCINES = ['V8', 'V10', 'Antirrábica', 'Gripe', 'Giardia', 'Bordetella', 'FeLV', 'Quádrupla Felina', 'Outra']

export function NewVaccineDialog({ open, onClose, patientId }: { open: boolean; onClose: () => void; patientId?: string }) {
  const qc = useQueryClient()
  const { data: patientsData } = useQuery({ queryKey: ['patients-all'], queryFn: () => patientsApi.list({ pageSize: 200 }) })
  const { data: users } = useQuery({ queryKey: ['tenant-users'], queryFn: tenantApi.users })
  const vets = users?.filter((u: any) => ['VET', 'OWNER', 'ADMIN'].includes(u.role)) ?? []

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      patientId: patientId ?? '',
      appliedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      dose: '1ª dose',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => vaccinesApi.create({
      ...data,
      appliedAt: new Date(data.appliedAt).toISOString(),
      nextDoseAt: data.nextDoseAt ? new Date(data.nextDoseAt).toISOString() : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vaccines'] })
      qc.invalidateQueries({ queryKey: ['patient'] })
      reset()
      onClose()
    },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Registrar Vacina</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          {!patientId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Paciente *</label>
              <select {...register('patientId')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Selecione...</option>
                {patientsData?.data?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.owner?.name})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Veterinário *</label>
            <select {...register('vetId')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">Selecione...</option>
              {vets.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Vacina *</label>
              <select {...register('name')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Selecione...</option>
                {COMMON_VACCINES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Dose *</label>
              <input {...register('dose')} placeholder="1ª dose" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fabricante</label>
              <input {...register('manufacturer')} placeholder="MSD, Zoetis..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Lote</label>
              <input {...register('lot')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Data de aplicação *</label>
              <input {...register('appliedAt')} type="datetime-local" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Próxima dose</label>
              <input {...register('nextDoseAt')} type="datetime-local" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea {...register('notes')} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 bg-primary text-white py-2.5 rounded-xl font-medium hover:bg-primary/90 transition disabled:opacity-60 flex items-center justify-center gap-2">
              {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
