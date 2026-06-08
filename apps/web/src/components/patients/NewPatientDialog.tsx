'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { patientsApi, ownersApi } from '@/lib/api'
import { X, Loader2 } from 'lucide-react'

const schema = z.object({
  ownerId: z.string().min(1, 'Selecione um tutor'),
  name: z.string().min(1, 'Nome obrigatório'),
  species: z.enum(['DOG', 'CAT', 'BIRD', 'RABBIT', 'HAMSTER', 'REPTILE', 'OTHER']),
  breed: z.string().min(1, 'Raça obrigatória'),
  gender: z.enum(['MALE', 'FEMALE']),
  birthDate: z.string().optional(),
  weight: z.coerce.number().positive().optional(),
  color: z.string().optional(),
  microchip: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function NewPatientDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: ownersData } = useQuery({ queryKey: ['owners-all'], queryFn: () => ownersApi.list({ pageSize: 200 }) })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { species: 'DOG', gender: 'MALE' },
  })

  const mutation = useMutation({
    mutationFn: patientsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      reset()
      onClose()
    },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Novo Paciente</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tutor *</label>
            <select {...register('ownerId')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">Selecione...</option>
              {ownersData?.data?.map((o: any) => (
                <option key={o.id} value={o.id}>{o.name} · {o.phone}</option>
              ))}
            </select>
            {errors.ownerId && <p className="text-red-500 text-xs mt-1">{errors.ownerId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome *</label>
              <input {...register('name')} placeholder="Rex" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Espécie *</label>
              <select {...register('species')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="DOG">Cão</option>
                <option value="CAT">Gato</option>
                <option value="BIRD">Ave</option>
                <option value="RABBIT">Coelho</option>
                <option value="HAMSTER">Hamster</option>
                <option value="REPTILE">Réptil</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Raça *</label>
              <input {...register('breed')} placeholder="Golden Retriever" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
              {errors.breed && <p className="text-red-500 text-xs mt-1">{errors.breed.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sexo *</label>
              <select {...register('gender')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="MALE">Macho</option>
                <option value="FEMALE">Fêmea</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nascimento</label>
              <input {...register('birthDate')} type="date" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Peso (kg)</label>
              <input {...register('weight')} type="number" step="0.1" placeholder="12.5" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cor</label>
              <input {...register('color')} placeholder="Dourado" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Microchip</label>
              <input {...register('microchip')} placeholder="000000000000000" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
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
              {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
