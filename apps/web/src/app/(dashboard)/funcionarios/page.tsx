'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { tenantApi } from '@/lib/api'
import {
  Plus, X, Loader2, UserCheck, UserX, Pencil,
  Shield, Stethoscope, ClipboardList, Crown, Search
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name:     z.string().min(2, 'Nome obrigatório'),
  email:    z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres')
    .regex(/^(?=.*[A-Z])(?=.*[0-9])/, 'Precisa de 1 letra maiúscula e 1 número'),
  role:     z.enum(['ADMIN', 'VET', 'RECEPTIONIST']),
  commissionRate: z.coerce.number().min(0).max(100).optional(),
})

const editSchema = z.object({
  name:           z.string().min(2, 'Nome obrigatório'),
  role:           z.enum(['ADMIN', 'VET', 'RECEPTIONIST']),
  commissionRate: z.coerce.number().min(0).max(100).optional(),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm   = z.infer<typeof editSchema>

// ── Constantes ────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  OWNER:        { label: 'Proprietário',  icon: Crown,         color: 'text-purple-700', bg: 'bg-purple-100' },
  ADMIN:        { label: 'Administrador', icon: Shield,        color: 'text-blue-700',   bg: 'bg-blue-100'   },
  VET:          { label: 'Veterinário',   icon: Stethoscope,   color: 'text-green-700',  bg: 'bg-green-100'  },
  RECEPTIONIST: { label: 'Recepcionista', icon: ClipboardList, color: 'text-orange-700', bg: 'bg-orange-100' },
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function FuncionariosPage() {
  const qc = useQueryClient()
  const [search, setSearch]         = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser]     = useState<any>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState<any>(null)

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ['tenant-users'],
    queryFn:  tenantApi.users,
  })

  // Filtragem local por nome, email ou role
  const filtered = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      ROLE_CONFIG[u.role]?.label.toLowerCase().includes(q)
    )
  })

  const active   = filtered.filter((u) => u.active)
  const inactive = filtered.filter((u) => !u.active)

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: tenantApi.createUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant-users'] }); setCreateOpen(false) },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditForm }) => tenantApi.updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant-users'] }); setEditUser(null) },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active
        ? tenantApi.deleteUser(id)                          // desativar
        : tenantApi.updateUser(id, { active: true }),       // reativar
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-users'] })
      setConfirmDeactivate(null)
    },
  })

  // ── Formulário de criação ──────────────────────────────────────────────────

  const {
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    watch: watchCreate,
    formState: { errors: createErrors },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema), defaultValues: { role: 'VET' } })

  const createRole = watchCreate('role')

  const {
    register: regEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    watch: watchEdit,
    formState: { errors: editErrors },
  } = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  const editRole = watchEdit('role')

  function openEdit(user: any) {
    setEditUser(user)
    resetEdit({ name: user.name, role: user.role, commissionRate: user.commissionRate ?? undefined })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funcionários</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {active.length} ativo{active.length !== 1 ? 's' : ''}
            {inactive.length > 0 && ` · ${inactive.length} inativo${inactive.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => { resetCreate(); setCreateOpen(true) }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Funcionário
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, email ou cargo..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Ativos */}
          {active.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide text-gray-500">
                  Funcionários Ativos
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {active.map((u) => <UserRow key={u.id} user={u} onEdit={openEdit} onToggle={setConfirmDeactivate} />)}
              </div>
            </div>
          )}

          {/* Inativos */}
          {inactive.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden opacity-75">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-400">
                  Inativos
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {inactive.map((u) => <UserRow key={u.id} user={u} onEdit={openEdit} onToggle={setConfirmDeactivate} />)}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <UserX className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum funcionário encontrado</p>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: criar funcionário ────────────────────────────────────────── */}
      {createOpen && (
        <Modal title="Novo Funcionário" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate((d) => createMutation.mutate(d))} className="space-y-4">
            <Field label="Nome completo *" error={createErrors.name?.message}>
              <input {...regCreate('name')} placeholder="João Silva"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
            </Field>
            <Field label="Email *" error={createErrors.email?.message}>
              <input {...regCreate('email')} type="email" placeholder="joao@clinica.com"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
            </Field>
            <Field label="Senha *" error={createErrors.password?.message}>
              <input {...regCreate('password')} type="password" placeholder="Mín. 8 chars, 1 maiúscula, 1 número"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
            </Field>
            <Field label="Cargo *">
              <select {...regCreate('role')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm">
                <option value="VET">Veterinário</option>
                <option value="RECEPTIONIST">Recepcionista</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </Field>
            {createRole === 'VET' && (
              <Field label="Comissão (%)" error={createErrors.commissionRate?.message}>
                <input {...regCreate('commissionRate')} type="number" min={0} max={100} step={0.5}
                  placeholder="Ex: 10"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
              </Field>
            )}
            {createMutation.isError && (
              <p className="text-red-500 text-sm">{(createMutation.error as any)?.response?.data?.error || 'Erro ao criar funcionário'}</p>
            )}
            <ModalActions
              onCancel={() => setCreateOpen(false)}
              loading={createMutation.isPending}
              submitLabel="Criar Funcionário"
            />
          </form>
        </Modal>
      )}

      {/* ── Modal: editar funcionário ───────────────────────────────────────── */}
      {editUser && (
        <Modal title={`Editar — ${editUser.name}`} onClose={() => setEditUser(null)}>
          <form onSubmit={handleEdit((d) => editMutation.mutate({ id: editUser.id, data: d }))} className="space-y-4">
            <Field label="Nome completo *" error={editErrors.name?.message}>
              <input {...regEdit('name')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
            </Field>
            {editUser.role !== 'OWNER' && (
              <Field label="Cargo *">
                <select {...regEdit('role')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm">
                  <option value="VET">Veterinário</option>
                  <option value="RECEPTIONIST">Recepcionista</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </Field>
            )}
            {(editRole === 'VET' || (editUser.role === 'VET' && editRole === undefined)) && (
              <Field label="Comissão (%)" error={editErrors.commissionRate?.message}>
                <input {...regEdit('commissionRate')} type="number" min={0} max={100} step={0.5}
                  placeholder="Ex: 10"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
              </Field>
            )}
            {editMutation.isError && (
              <p className="text-red-500 text-sm">{(editMutation.error as any)?.response?.data?.error || 'Erro ao salvar'}</p>
            )}
            <ModalActions
              onCancel={() => setEditUser(null)}
              loading={editMutation.isPending}
              submitLabel="Salvar Alterações"
            />
          </form>
        </Modal>
      )}

      {/* ── Confirmação: desativar ──────────────────────────────────────────── */}
      {confirmDeactivate && (
        <Modal
          title={confirmDeactivate.active ? 'Desativar Funcionário' : 'Reativar Funcionário'}
          onClose={() => setConfirmDeactivate(null)}
        >
          <p className="text-gray-600 text-sm mb-6">
            {confirmDeactivate.active
              ? <>Deseja desativar <strong>{confirmDeactivate.name}</strong>? O acesso ao sistema será bloqueado imediatamente, mas o histórico será preservado.</>
              : <>Deseja reativar <strong>{confirmDeactivate.name}</strong>? O acesso ao sistema será restabelecido.</>
            }
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmDeactivate(null)}
              className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={() => toggleActiveMutation.mutate({ id: confirmDeactivate.id, active: confirmDeactivate.active })}
              disabled={toggleActiveMutation.isPending}
              className={cn(
                'flex-1 py-2.5 rounded-xl font-medium transition disabled:opacity-60 flex items-center justify-center gap-2',
                confirmDeactivate.active
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-primary text-white hover:bg-primary/90'
              )}
            >
              {toggleActiveMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : confirmDeactivate.active ? 'Sim, desativar' : 'Sim, reativar'
              }
            </button>
          </div>
          {toggleActiveMutation.isError && (
            <p className="text-red-500 text-sm mt-3 text-center">
              {(toggleActiveMutation.error as any)?.response?.data?.error || 'Erro ao processar'}
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function UserRow({ user, onEdit, onToggle }: { user: any; onEdit: (u: any) => void; onToggle: (u: any) => void }) {
  const cfg = ROLE_CONFIG[user.role]
  const Icon = cfg?.icon ?? ClipboardList

  return (
    <div className={cn('flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition', !user.active && 'opacity-60')}>
      {/* Avatar */}
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm', cfg?.bg ?? 'bg-gray-100', cfg?.color ?? 'text-gray-700')}>
        {user.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900">{user.name}</p>
          <span className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', cfg?.bg, cfg?.color)}>
            <Icon className="w-3 h-3" />
            {cfg?.label ?? user.role}
          </span>
          {!user.active && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inativo</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
        {user.role === 'VET' && user.commissionRate != null && (
          <p className="text-xs text-gray-400 mt-0.5">Comissão: {user.commissionRate}%</p>
        )}
      </div>

      {/* Ações — OWNER não pode ser editado por esta tela */}
      {user.role !== 'OWNER' && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onEdit(user)}
            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition"
            title="Editar"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggle(user)}
            className={cn(
              'p-2 rounded-lg transition',
              user.active
                ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
            )}
            title={user.active ? 'Desativar' : 'Reativar'}
          >
            {user.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

function ModalActions({ onCancel, loading, submitLabel }: { onCancel: () => void; loading: boolean; submitLabel: string }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel}
        className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition">
        Cancelar
      </button>
      <button type="submit" disabled={loading}
        className="flex-1 bg-primary text-white py-2.5 rounded-xl font-medium hover:bg-primary/90 transition disabled:opacity-60 flex items-center justify-center gap-2">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : submitLabel}
      </button>
    </div>
  )
}
