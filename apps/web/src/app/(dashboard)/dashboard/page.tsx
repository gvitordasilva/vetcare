'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import { formatCurrency, formatDateTime, SPECIES_EMOJIS, APPOINTMENT_TYPE_LABELS, APPOINTMENT_STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  Calendar, PawPrint, Users, DollarSign, Syringe,
  TrendingUp, Clock, ArrowRight, Plus, Mic2, Video, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { getUser } from '@/lib/auth'

/* ── Animated counter ──────────────────────────────────────────────── */
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number | string; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const target = typeof value === 'string' ? parseFloat(value.replace(/\D/g, '')) : value
  const isMonetary = typeof value === 'string' && value.includes('R$')
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isNaN(target)) return
    const duration = 800
    const steps = 40
    const step = target / steps
    let current = 0
    ref.current = setInterval(() => {
      current += step
      if (current >= target) {
        setDisplay(target)
        clearInterval(ref.current!)
      } else {
        setDisplay(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(ref.current!)
  }, [target])

  if (isMonetary) return <>{formatCurrency(display)}</>
  return <>{prefix}{display.toLocaleString('pt-BR')}{suffix}</>
}

/* ── Stat card ─────────────────────────────────────────────────────── */
function StatCard({
  title, value, subtitle, icon: Icon, gradient, trend,
}: {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ElementType
  gradient: string
  trend?: { value: string; positive: boolean }
}) {
  return (
    <div className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-black text-gray-900 mt-1 tracking-tight">
            <AnimatedNumber value={value} />
          </p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend && (
            <div className={cn('flex items-center gap-1 mt-2 text-xs font-semibold', trend.positive ? 'text-emerald-600' : 'text-red-500')}>
              <TrendingUp className={cn('w-3 h-3', !trend.positive && 'rotate-180')} />
              {trend.value}
            </div>
          )}
        </div>
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 ml-4 transition-transform duration-200 group-hover:scale-110', gradient)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

/* ── Quick action button ────────────────────────────────────────────── */
function QuickAction({ icon: Icon, label, color, onClick }: { icon: React.ElementType; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm hover:-translate-y-0.5 bg-white transition-all duration-150 group"
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110', color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </button>
  )
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter()
  const user = getUser()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    refetchInterval: 60_000,
  })

  const { data: revenue } = useQuery({
    queryKey: ['dashboard-revenue'],
    queryFn: dashboardApi.revenue,
  })

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  })()

  const stats = data?.stats

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          onClick={() => router.push('/agenda?new=1')}
          className="hidden sm:flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          Nova consulta
        </button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
        <QuickAction icon={Calendar}  label="Agendar"     color="bg-blue-500"    onClick={() => router.push('/agenda?new=1')} />
        <QuickAction icon={PawPrint}  label="Paciente"    color="bg-emerald-500" onClick={() => router.push('/patients?new=1')} />
        <QuickAction icon={Mic2}      label="AI Scribe"   color="bg-purple-500"  onClick={() => router.push('/agenda')} />
        <QuickAction icon={Video}     label="Telemedicina" color="bg-cyan-500"   onClick={() => router.push('/telemedicina')} />
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-100 rounded w-16 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Consultas Hoje"
            value={stats?.todayAppointments ?? 0}
            icon={Calendar}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            trend={{ value: 'Hoje', positive: true }}
          />
          <StatCard
            title="Pacientes Ativos"
            value={stats?.totalPatients ?? 0}
            icon={PawPrint}
            gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
          />
          <StatCard
            title="Receita do Mês"
            value={stats?.monthRevenue ?? 0}
            icon={DollarSign}
            gradient="bg-gradient-to-br from-violet-500 to-violet-600"
          />
          <StatCard
            title="Vacinas Pendentes"
            value={stats?.vaccinesDueSoon ?? 0}
            subtitle="Próximos 30 dias"
            icon={Syringe}
            gradient={stats?.vaccinesDueSoon > 0 ? 'bg-gradient-to-br from-orange-400 to-orange-500' : 'bg-gradient-to-br from-gray-300 to-gray-400'}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today Schedule */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Agenda de Hoje
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full font-medium">
                {data?.todaySchedule?.length ?? 0} agendamentos
              </span>
              <button onClick={() => router.push('/agenda')} className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
                Ver tudo <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {!isLoading && data?.todaySchedule?.length === 0 && (
              <div className="flex flex-col items-center py-12 text-center">
                {/* Dog sleeping — SVG inline, sem dependência externa */}
                <svg width="72" height="56" viewBox="0 0 72 56" fill="none" className="mb-3 opacity-50" aria-hidden>
                  <ellipse cx="36" cy="42" rx="22" ry="12" fill="#e5e7eb"/>
                  <circle cx="36" cy="24" r="14" fill="#f3f4f6"/>
                  <ellipse cx="24" cy="13" rx="6" ry="9" transform="rotate(-15 24 13)" fill="#e5e7eb"/>
                  <ellipse cx="48" cy="13" rx="6" ry="9" transform="rotate(15 48 13)" fill="#e5e7eb"/>
                  {/* olhos fechados */}
                  <path d="M29 25 Q32 23 34 25" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M38 25 Q41 23 43 25" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
                  <ellipse cx="36" cy="29" rx="3" ry="2" fill="#9ca3af"/>
                  <path d="M32 32 Q36 35 40 32" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  {/* rabo */}
                  <path d="M57 42 Q66 35 63 28" stroke="#e5e7eb" strokeWidth="4" strokeLinecap="round"/>
                </svg>
                <p className="text-sm font-medium text-gray-400">Nenhum agendamento para hoje</p>
                <p className="text-xs text-gray-300 mt-1">Que tal aproveitar para um cochilo? 😄</p>
                <button onClick={() => router.push('/agenda?new=1')} className="mt-3 text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Criar agendamento
                </button>
              </div>
            )}
            {data?.todaySchedule?.map((appt: any) => (
              <div key={appt.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/80 transition-colors group cursor-pointer">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  {SPECIES_EMOJIS[appt.patient.species] || '🐾'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{appt.patient.name}</p>
                  <p className="text-xs text-gray-400">{APPOINTMENT_TYPE_LABELS[appt.type]} · {appt.vet.name}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', STATUS_COLORS[appt.status])}>
                    {APPOINTMENT_STATUS_LABELS[appt.status]}
                  </span>
                  <p className="text-sm font-bold text-gray-700 tabular-nums">
                    {new Date(appt.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent consultations */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Últimas Consultas
            </h2>
            <button onClick={() => router.push('/patients')} className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
              Ver mais <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {isLoading && [...Array(4)].map((_, i) => (
              <div key={i} className="px-6 py-3 animate-pulse">
                <div className="h-3.5 bg-gray-100 rounded w-24 mb-1.5" />
                <div className="h-3 bg-gray-100 rounded w-36 mb-1" />
                <div className="h-2.5 bg-gray-100 rounded w-20" />
              </div>
            ))}
            {data?.recentConsultations?.length === 0 && (
              <div className="flex flex-col items-center py-10 text-center">
                {/* Cat sitting — SVG inline */}
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" className="mb-2 opacity-40" aria-hidden>
                  <ellipse cx="26" cy="38" rx="16" ry="10" fill="#e5e7eb"/>
                  <circle cx="26" cy="22" r="12" fill="#f3f4f6"/>
                  {/* orelhas pontudas */}
                  <polygon points="14,14 18,6 22,14" fill="#e5e7eb"/>
                  <polygon points="30,14 34,6 38,14" fill="#e5e7eb"/>
                  {/* olhos */}
                  <ellipse cx="21" cy="22" rx="2.5" ry="3" fill="#9ca3af"/>
                  <ellipse cx="31" cy="22" rx="2.5" ry="3" fill="#9ca3af"/>
                  {/* bigodes */}
                  <line x1="14" y1="27" x2="22" y2="26" stroke="#d1d5db" strokeWidth="1"/>
                  <line x1="14" y1="29" x2="22" y2="28" stroke="#d1d5db" strokeWidth="1"/>
                  <line x1="30" y1="26" x2="38" y2="27" stroke="#d1d5db" strokeWidth="1"/>
                  <line x1="30" y1="28" x2="38" y2="29" stroke="#d1d5db" strokeWidth="1"/>
                  <ellipse cx="26" cy="27" rx="2" ry="1.5" fill="#f9a8d4"/>
                </svg>
                <p className="text-sm text-gray-400">Nenhuma consulta recente</p>
              </div>
            )}
            {data?.recentConsultations?.map((c: any) => (
              <div key={c.id} className="px-6 py-3 hover:bg-gray-50/80 transition-colors cursor-pointer group">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">{c.patient.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {c.diagnosis.length > 55 ? c.diagnosis.slice(0, 55) + '…' : c.diagnosis}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">{formatDateTime(c.date)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      {revenue && revenue.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Receita — Últimos 6 Meses
            </h2>
            <button onClick={() => router.push('/financeiro')} className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
              Financeiro <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenue} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                formatter={(v: any) => [formatCurrency(v), 'Receita']}
                labelStyle={{ fontWeight: 700, color: '#111' }}
                contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                cursor={{ fill: 'rgba(22,163,74,0.06)', radius: 8 }}
              />
              <Bar dataKey="revenue" fill="#16a34a" radius={[8, 8, 0, 0]} name="Receita" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
