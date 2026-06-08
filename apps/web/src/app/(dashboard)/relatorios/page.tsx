'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle,
  BarChart3, Users, ChevronLeft, ChevronRight
} from 'lucide-react'
import { reportsApi } from '@/lib/api'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const SERVICE_COLORS = ['#16a34a', '#2563eb', '#9333ea', '#ea580c', '#0891b2', '#d97706', '#dc2626']

function fmt(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function StatCard({ title, value, sub, icon: Icon, trend, color = 'green' }: any) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-700',
    blue:  'bg-blue-50 text-blue-700',
    red:   'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend != null && (
        <div className={`flex items-center gap-1 mt-3 text-sm font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {Math.abs(trend).toFixed(1)}% vs ano anterior
        </div>
      )}
    </div>
  )
}

export default function RelatoriosPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  const { data: financial, isLoading } = useQuery({
    queryKey: ['reports-financial', year],
    queryFn:  () => reportsApi.financial(year),
  })

  const { data: services } = useQuery({
    queryKey: ['reports-services', year],
    queryFn:  () => reportsApi.services({ year }),
  })

  const { data: topPatients } = useQuery({
    queryKey: ['reports-top-patients'],
    queryFn:  () => reportsApi.topPatients(8),
  })

  const monthlyChart = financial?.monthly?.map((m: any) => ({
    name:     MONTH_NAMES[m.month - 1],
    receita:  m.revenue,
    ticket:   m.ticketMedio,
    vencido:  m.overdue,
  })) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios Financeiros</h1>
          <p className="text-sm text-gray-500 mt-1">Visão completa da saúde financeira da clínica</p>
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <button onClick={() => setYear(y => y - 1)} className="p-1 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="font-semibold text-gray-900 w-12 text-center">{year}</span>
          <button
            onClick={() => setYear(y => y + 1)}
            disabled={year >= currentYear}
            className="p-1 hover:bg-gray-100 rounded-lg disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Receita Total"
              value={fmt(financial?.summary?.totalRevenue ?? 0)}
              sub={`${financial?.summary?.totalInvoices ?? 0} cobranças pagas`}
              icon={DollarSign}
              color="green"
            />
            <StatCard
              title="Ticket Médio"
              value={fmt(financial?.summary?.ticketMedioAnual ?? 0)}
              sub="por cobrança paga"
              icon={BarChart3}
              color="blue"
            />
            <StatCard
              title="Inadimplência"
              value={`${(financial?.summary?.inadimplenciaAnual ?? 0).toFixed(1)}%`}
              sub={fmt(financial?.summary?.totalOverdue ?? 0) + ' em atraso'}
              icon={AlertCircle}
              color="red"
            />
            <StatCard
              title="Ticket Máximo"
              value={fmt(Math.max(...(financial?.monthly?.map((m: any) => m.ticketMedio) ?? [0])))}
              sub="melhor mês"
              icon={TrendingUp}
              color="amber"
            />
          </div>

          {/* Gráfico receita mensal */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Receita Mensal {year}</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyChart} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Bar dataKey="receita" name="Receita" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vencido" name="Inadimplente" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Ticket médio + receita por serviço */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ticket médio */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Ticket Médio por Mês</h2>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthlyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${v.toFixed(0)}`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Line type="monotone" dataKey="ticket" name="Ticket Médio" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Receita por tipo de serviço */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Receita por Serviço {year}</h2>
              {services?.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={services}
                      dataKey="revenue"
                      nameKey="label"
                      cx="50%" cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {services.map((_: any, i: number) => (
                        <Cell key={i} fill={SERVICE_COLORS[i % SERVICE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-400 py-12">Nenhum dado de serviço para este período</p>
              )}
            </div>
          </div>

          {/* Método de pagamento */}
          {financial?.byPaymentMethod?.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Métodos de Pagamento</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {financial.byPaymentMethod.map((m: any) => {
                  const labels: Record<string, string> = { CASH: 'Dinheiro', CREDIT: 'Crédito', DEBIT: 'Débito', PIX: 'PIX', TRANSFER: 'Transferência' }
                  return (
                    <div key={m.method} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-sm font-medium text-gray-600">{labels[m.method] ?? m.method}</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">{fmt(m.total)}</p>
                      <p className="text-xs text-gray-400">{m.count} pagamentos</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top pacientes */}
          {topPatients?.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Top Pacientes por Receita (últimos 12 meses)</h2>
              <div className="space-y-3">
                {topPatients.map((p: any, i: number) => (
                  <div key={p.patientId} className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-900">{p.name}</span>
                        <span className="text-sm font-bold text-gray-900">{fmt(p.revenue)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(p.revenue / topPatients[0].revenue) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{p.invoiceCount} fat.</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
