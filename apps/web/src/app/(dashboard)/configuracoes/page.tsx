'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { tenantApi } from '@/lib/api'
import { Loader2, Save, Users, Building2, Plus, X, CheckCircle, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const newUserSchema = z.object({
  name:     z.string().min(2, 'Nome obrigatório'),
  email:    z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').regex(/^(?=.*[A-Z])(?=.*[0-9])/, 'Precisa de 1 maiúscula e 1 número'),
  role:     z.enum(['ADMIN', 'VET', 'RECEPTIONIST']),
})
type NewUserForm = z.infer<typeof newUserSchema>

export default function ConfiguracoesPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'clinic' | 'users' | 'billing'>('clinic')
  const [savedOk, setSavedOk] = useState(false)
  const [newUserOpen, setNewUserOpen] = useState(false)

  const { data: tenant } = useQuery({ queryKey: ['tenant'], queryFn: tenantApi.get })
  const { data: users }  = useQuery({ queryKey: ['tenant-users'], queryFn: tenantApi.users })

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ values: tenant })

  const updateTenant = useMutation({
    mutationFn: tenantApi.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant'] })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 3000)
    },
  })

  const {
    register: regUser,
    handleSubmit: handleNewUser,
    reset: resetNewUser,
    formState: { errors: userErrors },
  } = useForm<NewUserForm>({ resolver: zodResolver(newUserSchema), defaultValues: { role: 'VET' } })

  const createUser = useMutation({
    mutationFn: tenantApi.createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-users'] })
      resetNewUser()
      setNewUserOpen(false)
    },
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'clinic',   label: 'Clínica',     icon: Building2 },
          { key: 'users',    label: 'Usuários',    icon: Users },
          { key: 'billing',  label: 'Assinatura',  icon: CreditCard },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'clinic' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Dados da Clínica</h2>
          <form onSubmit={handleSubmit((d) => updateTenant.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'name',    label: 'Nome da Clínica' },
                { name: 'phone',   label: 'Telefone' },
                { name: 'address', label: 'Endereço' },
                { name: 'city',    label: 'Cidade' },
                { name: 'state',   label: 'UF' },
                { name: 'zipCode', label: 'CEP' },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                  <input
                    {...register(f.name)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={updateTenant.isPending}
                className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition disabled:opacity-60"
              >
                {updateTenant.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar alterações
              </button>
              {savedOk && (
                <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" /> Salvo com sucesso!
                </span>
              )}
              {updateTenant.isError && (
                <span className="text-red-500 text-sm">Erro ao salvar. Tente novamente.</span>
              )}
            </div>
          </form>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Equipe</h2>
            <button
              onClick={() => setNewUserOpen(true)}
              className="flex items-center gap-1.5 text-sm bg-primary text-white px-3 py-2 rounded-xl font-medium hover:bg-primary/90 transition"
            >
              <Plus className="w-4 h-4" /> Novo Usuário
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {users?.map((u: any) => (
              <div key={u.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-semibold text-sm">{u.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">{u.role}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {u.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal novo usuário */}
      {newUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Novo Usuário</h2>
              <button onClick={() => setNewUserOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleNewUser((d) => createUser.mutate(d))} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo *</label>
                <input {...regUser('name')} placeholder="João Silva" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
                {userErrors.name && <p className="text-red-500 text-xs mt-1">{userErrors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <input {...regUser('email')} type="email" placeholder="joao@clinica.com" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
                {userErrors.email && <p className="text-red-500 text-xs mt-1">{userErrors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha *</label>
                <input {...regUser('password')} type="password" placeholder="Mín. 8 chars, 1 maiúscula, 1 número" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
                {userErrors.password && <p className="text-red-500 text-xs mt-1">{userErrors.password.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Perfil *</label>
                <select {...regUser('role')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="VET">Veterinário</option>
                  <option value="RECEPTIONIST">Recepcionista</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              {createUser.isError && (
                <p className="text-red-500 text-sm">{(createUser.error as any)?.response?.data?.error || 'Erro ao criar usuário'}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setNewUserOpen(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition">Cancelar</button>
                <button type="submit" disabled={createUser.isPending} className="flex-1 bg-primary text-white py-2.5 rounded-xl font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
                  {createUser.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</> : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {activeTab === 'billing' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-500 mb-4">
            Gerencie sua assinatura, histórico de pagamentos e dados de cobrança.
          </p>
          <Link
            href="/configuracoes/billing"
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition"
          >
            <CreditCard className="w-4 h-4" />
            Gerenciar assinatura
          </Link>
        </div>
      )}
    </div>
  )
}
