'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import { formatCurrency, formatDateTime, SPECIES_EMOJIS, APPOINTMENT_TYPE_LABELS, APPOINTMENT_STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  Calendar, PawPrint, Users, DollarSign, Syringe,
  TrendingUp, Clock, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

function StatCard({ title, value, subtitle, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    refetchInterval: 60_000,
  })

  const { data: revenue } = useQuery({
    queryKey: ['dashboard-revenue'],
    queryFn: dashboardApi.revenue,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  const stats = data?.stats

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral da sua clínica</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Consultas Hoje"
          value={stats?.todayAppointments ?? 0}
          icon={Calendar}
          color="bg-blue-500"
        />
        <StatCard
          title="Pacientes Ativos"
          value={stats?.totalPatients ?? 0}
          icon={PawPrint}
          color="bg-emerald-500"
        />
        <StatCard
          title="Receita do Mês"
          value={formatCurrency(stats?.monthRevenue ?? 0)}
          icon={DollarSign}
          color="bg-violet-500"
        />
        <StatCard
          title="Vacinas Pendentes"
          value={stats?.vaccinesDueSoon ?? 0}
          subtitle="Próximos 30 dias"
          icon={Syringe}
          color={stats?.vaccinesDueSoon > 0 ? 'bg-orange-500' : 'bg-gray-400'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today Schedule */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Agenda de Hoje
            </h2>
            <span className="text-sm text-gray-400">{data?.todaySchedule?.length ?? 0} agendamentos</span>
          </div>
          <div className="divide-y divide-gray-50">
            {data?.todaySchedule?.length === 0 && (
              <p className="text-center text-gray-400 py-10 text-sm">Nenhum agendamento para hoje</p>
            )}
            {data?.todaySchedule?.map((appt: any) => (
              <div key={appt.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition">
                <div className="text-center w-14 flex-shrink-0">
                  <p className="text-lg">{SPECIES_EMOJIS[appt.patient.species] || '🐾'}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{appt.patient.name}</p>
                  <p className="text-sm text-gray-500">{APPOINTMENT_TYPE_LABELS[appt.type]} · Dr(a). {appt.vet.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-gray-700">
                    {new Date(appt.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[appt.status])}>
                    {APPOINTMENT_STATUS_LABELS[appt.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent consultations */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Últimas Consultas
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {data?.recentConsultations?.map((c: any) => (
              <div key={c.id} className="px-6 py-3">
                <p className="text-sm font-medium text-gray-900">{c.patient.name}</p>
                <p className="text-xs text-gray-500">{c.diagnosis.slice(0, 50)}{c.diagnosis.length > 50 ? '...' : ''}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(c.date)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      {revenue && revenue.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Receita dos Últimos 6 Meses
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenue} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} labelStyle={{ fontWeight: 600 }} />
              <Bar dataKey="revenue" fill="#16a34a" radius={[6, 6, 0, 0]} name="Receita" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
