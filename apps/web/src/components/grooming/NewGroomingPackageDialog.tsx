'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groomingApi, patientsApi } from '@/lib/api'
import { X, Loader2 } from 'lucide-react'

const schema = z.object({
  patientId:     z.string().min(1, 'Selecione um paciente'),
  name:          z.string().min(1, 'Nome do pacote obrigatório'),
  totalSessions: z.coerce.number().int().min(1, 'Mínimo 1 sessão').max(100),
  price:         z.coerce.number().positive('Valor inválido'),
  validUntil:    z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function NewGroomingPackageDialog({
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

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { totalSessions: 5 },
  })

  const mutation = useMutation({
    mutationFn: (d: FormData) =>
      groomingApi.createPackage({
        ...d,
        validUntil: d.validUntil ? new Date(`${d.validUntil}T23:59:59.000Z`).toISOString() : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grooming-packages'] })
      reset()
      onClose()
    },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Novo Pacote de Banho & Tosa</h2>
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

          {/* Nome do pacote */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do Pacote *</label>
            <input
              {...register('name')}
              placeholder="Ex: Pacote 5 Banhos, Pacote Tosa Mensal..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Sessões */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nº de Sessões *</label>
              <input
                {...register('totalSessions')}
                type="number"
                min={1}
                max={100}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {errors.totalSessions && <p className="text-red-500 text-xs mt-1">{errors.totalSessions.message}</p>}
            </div>

            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor (R$) *</label>
              <input
                {...register('price')}
                type="number"
                min={0}
                step={0.01}
                placeholder="0,00"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
            </div>
          </div>

          {/* Validade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Válido até</label>
            <input
              {...register('validUntil')}
              type="date"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-gray-400 mt-1">Deixe em branco para sem prazo de validade</p>
          </div>

          {mutation.error && (
            <p className="text-red-500 text-sm">
              {(mutation.error as any).response?.data?.error || 'Erro ao criar pacote'}
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
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                : 'Criar Pacote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
