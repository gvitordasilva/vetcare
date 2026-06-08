'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { superAdminApi } from '@/lib/superadmin-api'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Building2, Users, PawPrint, Calendar, Plus, X, Loader2, KeyRound, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-slate-700 text-slate-300',
  PRO: 'bg-violet-900 text-violet-300',
  ENTERPRISE: 'bg-amber-900 text-amber-300',
}

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['OWNER', 'ADMIN', 'VET', 'RECEPTIONIST']),
})
type UserFormData = z.infer<typeof userSchema>

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [newUserOpen, setNewUserOpen] = useState(false)
  const [resetUserId, setResetUserId] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['sa-tenant', id],
    queryFn: () => superAdminApi.getTenant(id),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: 'ADMIN' },
  })

  const createUser = useMutation({
    mutationFn: (data: UserFormData) => superAdminApi.createUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa-tenant', id] }); reset(); setNewUserOpen(false) },
  })

  const resetPwd = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      superAdminApi.resetPassword(id, userId, password),
    onSuccess: () => { setResetUserId(null); setResetPassword('') },
  })

  const updatePlan = useMutation({
    mutationFn: (plan: string) => superAdminApi.updateTenant(id, { plan }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-tenant', id] }),
  })

  const toggleActive = useMutation({
    mutationFn: (active: boolean) => superAdminApi.updateTenant(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-tenant', id] }),
  })

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" /></div>
  }
  if (!tenant) return <p className="text-slate-400 text-center py-20">Clínica não encontrada</p>

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-violet-900/50 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
              <p className="text-slate-400 text-sm">{tenant.email} · /{tenant.slug}</p>
              <p className="text-slate-500 text-xs mt-1">{tenant.address}, {tenant.city} — {tenant.state}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={tenant.plan}
              onChange={(e) => updatePlan.mutate(e.target.value)}
              className="text-sm bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="FREE">FREE</option>
              <option value="PRO">PRO</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>
            <button
              onClick={() => toggleActive.mutate(!tenant.active)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition border',
                tenant.active
                  ? 'border-red-700 text-red-400 hover:bg-red-900/30'
                  : 'border-emerald-700 text-emerald-400 hover:bg-emerald-900/30'
              )}
            >
              {tenant.active ? <><XCircle className="w-4 h-4" /> Desativar</> : <><CheckCircle2 className="w-4 h-4" /> Ativar</>}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pacientes', value: tenant._count.patients, icon: PawPrint },
          { label: 'Usuários', value: tenant._count.users, icon: Users },
          { label: 'Consultas', value: tenant._count.consultations, icon: Calendar },
          { label: 'Agendamentos', value: tenant._count.appointments, icon: Calendar },
        ].map((s) => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Users */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" /> Usuários da Clínica
          </h2>
          <button
            onClick={() => setNewUserOpen(true)}
            className="flex items-center gap-1.5 text-sm bg-violet-600 text-white px-3 py-1.5 rounded-xl hover:bg-violet-500 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
        <div className="divide-y divide-slate-800">
          {tenant.users.map((u: any) => (
            <div key={u.id} className="flex items-center gap-4 px-6 py-4">
              <div className="w-9 h-9 bg-violet-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-violet-300 font-semibold text-sm">{u.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{u.name}</p>
                <p className="text-xs text-slate-400">{u.email}</p>
              </div>
              <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-medium">{u.role}</span>
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', u.active ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400')}>
                {u.active ? 'Ativo' : 'Inativo'}
              </span>
              {resetUserId === u.id ? (
                <div className="flex items-center gap-2">
                  <input
                    value={resetPassword}
                    onChange={e => setResetPassword(e.target.value)}
                    type="password"
                    placeholder="Nova senha"
                    className="text-xs bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 w-32 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <button
                    onClick={() => resetPwd.mutate({ userId: u.id, password: resetPassword })}
                    disabled={resetPassword.length < 8}
                    className="text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-500 disabled:opacity-40 transition"
                  >
                    Salvar
                  </button>
                  <button onClick={() => setResetUserId(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <button onClick={() => setResetUserId(u.id)} className="text-slate-500 hover:text-violet-400 transition" title="Redefinir senha">
                  <KeyRound className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* New user dialog */}
      {newUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Adicionar Usuário</h2>
              <button onClick={() => setNewUserOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit((d) => createUser.mutate(d))} className="p-6 space-y-4">
              {[
                { name: 'name', label: 'Nome *', placeholder: 'Dr(a). Nome' },
                { name: 'email', label: 'Email *', type: 'email' },
                { name: 'password', label: 'Senha inicial *', type: 'password', placeholder: 'Mín. 8 caracteres' },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">{f.label}</label>
                  <input
                    {...register(f.name as any)}
                    type={f.type || 'text'}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-500"
                  />
                  {(errors as any)[f.name] && <p className="text-red-400 text-xs mt-1">{(errors as any)[f.name].message}</p>}
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Função *</label>
                <select {...register('role')} className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="OWNER">Owner</option>
                  <option value="ADMIN">Admin</option>
                  <option value="VET">Veterinário</option>
                  <option value="RECEPTIONIST">Recepcionista</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setNewUserOpen(false)} className="flex-1 border border-slate-700 text-slate-300 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition">Cancelar</button>
                <button type="submit" disabled={createUser.isPending} className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl font-medium hover:bg-violet-500 disabled:opacity-60 flex items-center justify-center gap-2">
                  {createUser.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
