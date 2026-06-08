'use client'

import { useQuery } from '@tanstack/react-query'
import { superAdminApi } from '@/lib/superadmin-api'
import { Building2, Users, PawPrint, Calendar, TrendingUp, CheckCircle2, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-slate-700 text-slate-300',
  PRO: 'bg-violet-900 text-violet-300',
  ENTERPRISE: 'bg-amber-900 text-amber-300',
}

function Stat({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 font-medium">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

export default function SuperAdminDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['sa-metrics'],
    queryFn: superAdminApi.metrics,
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard da Plataforma</h1>
        <p className="text-slate-400 text-sm mt-1">Visão geral de todas as clínicas cadastradas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat title="Total de Clínicas" value={metrics?.totalTenants ?? 0} icon={Building2} color="bg-violet-600" />
        <Stat title="Clínicas Ativas" value={metrics?.activeTenants ?? 0} icon={CheckCircle2} color="bg-emerald-600" />
        <Stat title="Total de Pacientes" value={metrics?.totalPatients ?? 0} icon={PawPrint} color="bg-blue-600" />
        <Stat title="Usuários na Plataforma" value={metrics?.totalUsers ?? 0} icon={Users} color="bg-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            Clínicas por Plano
          </h2>
          <div className="space-y-3">
            {['FREE', 'PRO', 'ENTERPRISE'].map((plan) => {
              const count = metrics?.planBreakdown?.[plan] ?? 0
              const total = metrics?.totalTenants || 1
              const pct = Math.round((count / total) * 100)
              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${PLAN_COLORS[plan]}`}>{plan}</span>
                    <span className="text-slate-400">{count} clínica{count !== 1 ? 's' : ''} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${plan === 'FREE' ? 'bg-slate-500' : plan === 'PRO' ? 'bg-violet-500' : 'bg-amber-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent tenants */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-violet-400" />
              Últimas Clínicas Cadastradas
            </h2>
            <Link href="/superadmin/tenants" className="text-xs text-violet-400 hover:underline">Ver todas</Link>
          </div>
          <div className="divide-y divide-slate-800">
            {metrics?.recentTenants?.map((t: any) => (
              <Link key={t.id} href={`/superadmin/tenants/${t.id}`} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-800/50 transition">
                <div className="w-9 h-9 bg-violet-900/60 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{t.name}</p>
                  <p className="text-xs text-slate-400">{t._count.patients} pacientes · {formatDate(t.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${PLAN_COLORS[t.plan]}`}>{t.plan}</span>
                  {t.active
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : <XCircle className="w-4 h-4 text-red-400" />}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
