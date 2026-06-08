'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invoicesApi, ownersApi, patientsApi } from '@/lib/api'
import { X, Loader2, Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const schema = z.object({
  ownerId: z.string().optional(),
  patientId: z.string().optional(),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.coerce.number().positive(),
    unitPrice: z.coerce.number().positive(),
  })).min(1),
})

type FormData = z.infer<typeof schema>

export function NewInvoiceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: ownersData } = useQuery({ queryKey: ['owners-all'], queryFn: () => ownersApi.list({ pageSize: 200 }) })
  const { data: patientsData } = useQuery({ queryKey: ['patients-all'], queryFn: () => patientsApi.list({ pageSize: 200 }) })

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ description: '', quantity: 1, unitPrice: 0 }], discount: 0 },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')
  const discount = watch('discount') || 0
  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0)
  const total = subtotal - discount

  const mutation = useMutation({
    mutationFn: invoicesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); onClose() },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Nova Cobrança</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tutor</label>
              <select {...register('ownerId')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Selecione...</option>
                {ownersData?.data?.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Paciente</label>
              <select {...register('patientId')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Selecione...</option>
                {patientsData?.data?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Itens *</label>
              <button
                type="button"
                onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" /> Adicionar item
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex gap-2">
                  <input
                    {...register(`items.${idx}.description`)}
                    placeholder="Descrição"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    {...register(`items.${idx}.quantity`)}
                    type="number" min={1} step={1}
                    placeholder="Qtd"
                    className="w-16 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    {...register(`items.${idx}.unitPrice`)}
                    type="number" min={0} step={0.01}
                    placeholder="Preço"
                    className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="w-20 flex items-center justify-end text-sm text-gray-500 font-medium">
                    {formatCurrency((Number(items[idx]?.quantity) || 0) * (Number(items[idx]?.unitPrice) || 0))}
                  </span>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(idx)} className="text-gray-300 hover:text-red-400 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="text-gray-600">Desconto (R$)</label>
              <input
                {...register('discount')}
                type="number" min={0} step={0.01}
                className="w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-right text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-2">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea {...register('notes')} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm" />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 bg-primary text-white py-2.5 rounded-xl font-medium hover:bg-primary/90 transition disabled:opacity-60 flex items-center justify-center gap-2">
              {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Criar Cobrança'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
