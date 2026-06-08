'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { hospitalizationsApi, patientsApi, tenantApi } from '@/lib/api'
import { X, Loader2 } from 'lucide-react'

const schema = z.object({
  patientId:        z.string().min(1, 'Selecione um paciente'),
  responsibleVetId: z.string().min(1, 'Selecione um veterinário'),
  reason:           z.string().min(3, 'Descreva o motivo da internação'),
  severity:         z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  room:             z.string().optional(),
  notes:            z.string().optional(),
})

type FormData = z.infer<typeof schema>

const SEVERITY_LABELS = {
  LOW:      { label: 'Baixa',    color: 'text-green-700' },
  MEDIUM:   { label: 'Média',    color: 'text-amber-700' },
  HIGH:     { label: 'Alta',     color: 'text-orange-700' },
  CRITICAL: { label: 'Crítica', color: 'text-red-700' },
}

export function NewHospitalizationDialog({
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
    defaultValues: { severity: 'MEDIUM' },
  })

  const mutation = useMutation({
    mutationFn: hospitalizationsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hospitalizations-whiteboard'] })
      reset()
      onClose()
    },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Nova Internação</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">

          {/* Paciente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Paciente *</label>
            <select
              {...register('patientId')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
            >
              <option value="">Selecione o paciente...</option>
              {patientsData?.data?.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.owner?.name}
                </option>
              ))}
            </select>
            {errors.patientId && <p className="text-red-500 text-xs mt-1">{errors.patientId.message}</p>}
          </div>

          {/* Veterinário responsável */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Veterinário Responsável *</label>
            <select
              {...register('responsibleVetId')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
            >
              <option value="">Selecione o veterinário...</option>
              {vets.map((v: any) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            {errors.responsibleVetId && <p className="text-red-500 text-xs mt-1">{errors.responsibleVetId.message}</p>}
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo da Internação *</label>
            <textarea
              {...register('reason')}
              rows={3}
              placeholder="Descreva o motivo clínico da internação..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Severidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Severidade *</label>
              <select
                {...register('severity')}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
              >
                {Object.entries(SEVERITY_LABELS).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Baia / quarto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Baia / Quarto</label>
              <input
                {...register('room')}
                placeholder="Ex: Baia 3"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações Iniciais</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Condições de chegada, procedimentos iniciais..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {mutation.error && (
            <p className="text-red-500 text-sm">
              {(mutation.error as any).response?.data?.error || 'Erro ao registrar internação'}
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
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Internando...</>
                : 'Registrar Internação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
