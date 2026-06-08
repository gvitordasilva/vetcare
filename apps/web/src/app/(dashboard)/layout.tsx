'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Users, Calendar, Syringe, DollarSign,
  Settings, PawPrint, Menu, X, LogOut, ChevronRight, Bell,
  ClipboardList, Package, BedDouble, Scissors, BarChart3,
  Video, FileText, TrendingUp, UserCog
} from 'lucide-react'
import { isAuthenticated, clearAuth, getUser, getTenant } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { authApi } from '@/lib/api'
import { useBillingStatus } from '@/hooks/useBillingStatus'
import Cookies from 'js-cookie'

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/agenda',       label: 'Agenda',        icon: Calendar },
  { href: '/patients',     label: 'Pacientes',     icon: PawPrint },
  { href: '/tutores',      label: 'Tutores',       icon: Users },
  { href: '/vaccines',     label: 'Vacinas',       icon: Syringe },
  { href: '/internacoes',  label: 'Internação',    icon: BedDouble },
  { href: '/banho-tosa',   label: 'Banho & Tosa',  icon: Scissors },
  { href: '/financeiro',   label: 'Financeiro',    icon: DollarSign },
  { href: '/relatorios',   label: 'Relatórios',    icon: BarChart3 },
  { href: '/comissoes',    label: 'Comissões',     icon: TrendingUp },
  { href: '/telemedicina', label: 'Telemedicina',  icon: Video },
  { href: '/nfe',          label: 'Notas Fiscais', icon: FileText },
  { href: '/funcionarios', label: 'Funcionários',  icon: UserCog },
  { href: '/configuracoes',label: 'Configurações', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [tenant, setTenant] = useState<any>(null)
  const { data: billing } = useBillingStatus()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    setUser(getUser())
    setTenant(getTenant())
  }, [])

  async function handleLogout() {
    const refreshToken = Cookies.get('refreshToken')
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {})
    clearAuth()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300',
        'lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-100">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <PawPrint className="w-4 h-4 text-white" />
          </div>
          <div className="overflow-hidden">
            <p className="font-bold text-gray-900 truncate">{tenant?.name || 'VetCare'}</p>
            <p className="text-xs text-gray-400">Sistema Veterinário</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition" title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-4 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <Menu className="w-5 h-5" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Banner de trial */}
        {billing?.status === 'TRIAL' && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between text-sm flex-shrink-0">
            <span className="text-amber-800">
              Período de teste:{' '}
              <strong>{billing.trialDaysRemaining} dia(s) restante(s)</strong>
            </span>
            <Link href="/assinar" className="font-semibold underline text-amber-700 hover:text-amber-900 ml-4">
              Assinar agora
            </Link>
          </div>
        )}
        {billing?.status === 'PAST_DUE' && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-2 flex items-center justify-between text-sm flex-shrink-0">
            <span className="text-red-800">
              <strong>Pagamento em atraso</strong> — regularize para manter o acesso.
            </span>
            <Link href="/configuracoes/billing" className="font-semibold underline text-red-700 hover:text-red-900 ml-4">
              Ver cobrança
            </Link>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
