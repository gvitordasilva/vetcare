'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { superAdminApi } from '@/lib/superadmin-api'
import { formatDate } from '@/lib/utils'
import { Building2, Plus, Search, CheckCircle2, XCircle, ChevronRight, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-slate-700 text-slate-300',
  PRO: 'bg-violet-900 text-violet-300',
  ENTERPRISE: 'bg-amber-900 text-amber-300',
}

const schema = z.object({
  clinicName: z.string().min(2, 'Nome obrigatório'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  clinicEmail: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  address: z.string().min(3, 'Endereço obrigatório'),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().length(2, 'UF com 2 letras'),
  zipCode: z.string().min(8, 'CEP inválido'),
  plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']),
  ownerName: z.string().min(2, 'Nome do responsável obrigatório'),
  ownerEmail: z.string().email('Email do responsável inválido'),
  ownerPassword: z.string().min(8, 'Mínimo 8 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function TenantsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [newOpen, setNewOpen] = useState(false)
  const [error, setError] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['sa-tenants', search, page],
    queryFn: () => superAdminApi.tenants({ search: search || undefined, page, pageSize: 20 }),
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { plan: 'FREE' },
  })

  const mutation = useMutation({
    mutationFn: superAdminApi.createTenant,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa-tenants'] }); reset(); setNewOpen(false); setError('') },
    onError: (err: any) => setError(err.response?.data?.error || 'Erro ao criar clínica'),
  })

  function handleClinicNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setValue('slug', slug)
  }

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      superAdminApi.updateTenant(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-tenants'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clínicas</h1>
          <p className="text-slate-400 text-sm mt-0.5">{data?.total ?? 0} clínicas cadastradas</p>
        </div>
        <button
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-violet-500 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Clínica
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar por nome, email ou slug..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-500"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin w-6 h-6 border-4 border-violet-500 border-t-transparent rounded-full" /></div>
        ) : data?.data?.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">Nenhuma clínica encontrada</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase">Clínica</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase hidden md:table-cell">Plano</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase hidden lg:table-cell">Usuários / Pacientes</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase hidden md:table-cell">Criada em</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data?.data?.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.slug} · {t.email}</p>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${PLAN_COLORS[t.plan]}`}>{t.plan}</span>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell text-sm text-slate-400">
                    {t._count.users} usuários · {t._count.patients} pacientes
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-sm text-slate-400">
                    {formatDate(t.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActive.mutate({ id: t.id, active: !t.active })}
                      className={cn(
                        'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition',
                        t.active ? 'bg-emerald-900/50 text-emerald-400 hover:bg-red-900/50 hover:text-red-400' : 'bg-red-900/50 text-red-400 hover:bg-emerald-900/50 hover:text-emerald-400'
                      )}
                      title={t.active ? 'Clique para desativar' : 'Clique para ativar'}
                    >
                      {t.active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {t.active ? 'Ativa' : 'Inativa'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/superadmin/tenants/${t.id}`} className="inline-flex items-center gap-1 text-violet-400 text-sm font-medium hover:underline">
                      Gerenciar <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
            <p className="text-sm text-slate-400">Página {data.page} de {data.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-3 py-1.5 border border-slate-700 text-slate-300 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-800 transition">Anterior</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages} className="px-3 py-1.5 border border-slate-700 text-slate-300 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-800 transition">Próxima</button>
            </div>
          </div>
        )}
      </div>

      {/* New Tenant Dialog */}
      {newOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Nova Clínica</h2>
              <button onClick={() => { setNewOpen(false); setError('') }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-3">Dados da Clínica</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome da Clínica *</label>
                    <input
                      {...register('clinicName')}
                      onChange={(e) => { register('clinicName').onChange(e); handleClinicNameChange(e) }}
                      placeholder="Clínica VetSaúde"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-500"
                    />
                    {errors.clinicName && <p className="text-red-400 text-xs mt-1">{errors.clinicName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Slug (URL) *</label>
                    <input {...register('slug')} placeholder="clinica-vetsaude" className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-500" />
                    {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Email da Clínica *</label>
                    <input {...register('clinicEmail')} type="email" className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-500" />
                    {errors.clinicEmail && <p className="text-red-400 text-xs mt-1">{errors.clinicEmail.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Telefone *</label>
                    <input {...register('phone')} placeholder="(11) 99999-9999" className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-500" />
                    {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Plano *</label>
                    <select {...register('plan')} className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500">
                      <option value="FREE">FREE</option>
                      <option value="PRO">PRO</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Endereço *</label>
                    <input {...register('address')} placeholder="Rua, número" className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-500" />
                    {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Cidade *</label>
                    <input {...register('city')} className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">UF *</label>
                      <input {...register('state')} maxLength={2} className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 uppercase" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">CEP *</label>
                      <input {...register('zipCode')} className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-3">Responsável (Owner)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome *</label>
                    <input {...register('ownerName')} placeholder="Dr(a). Nome" className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-500" />
                    {errors.ownerName && <p className="text-red-400 text-xs mt-1">{errors.ownerName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Email *</label>
                    <input {...register('ownerEmail')} type="email" className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    {errors.ownerEmail && <p className="text-red-400 text-xs mt-1">{errors.ownerEmail.message}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Senha inicial *</label>
                    <input {...register('ownerPassword')} type="password" placeholder="Mín. 8 caracteres" className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-500" />
                    {errors.ownerPassword && <p className="text-red-400 text-xs mt-1">{errors.ownerPassword.message}</p>}
                  </div>
                </div>
              </div>

              {error && <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setNewOpen(false); setError('') }} className="flex-1 border border-slate-700 text-slate-300 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition">Cancelar</button>
                <button type="submit" disabled={mutation.isPending} className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl font-medium hover:bg-violet-500 transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</> : 'Criar Clínica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
