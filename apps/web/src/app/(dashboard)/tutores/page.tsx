'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ownersApi } from '@/lib/api'
import { SPECIES_EMOJIS } from '@/lib/utils'
import { Search, Plus, Users, X, Loader2 } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10),
  cpf: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function TutoresPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [newOpen, setNewOpen] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['owners', search, page],
    queryFn: () => ownersApi.list({ search: search || undefined, page, pageSize: 20 }),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: ownersApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owners'] }); reset(); setNewOpen(false) },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tutores</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} tutores cadastrados</p>
        </div>
        <button
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition text-sm"
        >
          <Plus className="w-4 h-4" /> Novo Tutor
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar por nome, email, telefone ou CPF..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="owners-table">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : data?.data?.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum tutor encontrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase">Tutor</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Contato</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase">Animais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.data?.map((owner: any) => (
                <tr key={owner.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{owner.name}</p>
                    {owner.cpf && <p className="text-xs text-gray-400">CPF: {owner.cpf}</p>}
                    {owner.city && <p className="text-xs text-gray-400">{owner.city}</p>}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <p className="text-sm text-gray-700">{owner.phone}</p>
                    {owner.email && <p className="text-xs text-gray-400">{owner.email}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {owner.patients?.slice(0, 3).map((p: any) => (
                        <span key={p.id} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                          {SPECIES_EMOJIS[p.species]} {p.name}
                        </span>
                      ))}
                      {owner._count?.patients > 3 && (
                        <span className="text-xs text-gray-400">+{owner._count.patients - 3}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginação */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Página {data.page} de {data.totalPages} · {data.total} tutores
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= data.totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New owner dialog */}
      {newOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Novo Tutor</h2>
              <button onClick={() => setNewOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit((d) => mutation.mutate({
                  ...d,
                  email: d.email || undefined,
                  cpf:   d.cpf   || undefined,   // nunca enviar string vazia para CPF
                }))} className="p-6 space-y-4">
              {[
                { name: 'name', label: 'Nome completo *', placeholder: 'Maria Silva' },
                { name: 'phone', label: 'Telefone *', placeholder: '(11) 99999-9999' },
                { name: 'email', label: 'Email', placeholder: 'email@exemplo.com' },
                { name: 'cpf', label: 'CPF', placeholder: '000.000.000-00' },
                { name: 'address', label: 'Endereço', placeholder: 'Rua...' },
                { name: 'city', label: 'Cidade', placeholder: 'São Paulo' },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                  <input
                    {...register(f.name as any)}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {(errors as any)[f.name] && <p className="text-red-500 text-xs mt-1">{(errors as any)[f.name].message}</p>}
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setNewOpen(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition">Cancelar</button>
                <button type="submit" disabled={mutation.isPending} className="flex-1 bg-primary text-white py-2.5 rounded-xl font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
                  {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
