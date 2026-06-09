'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Users, Calendar, Syringe, DollarSign,
  Settings, PawPrint, Menu, X, LogOut, ChevronRight, Bell,
  BedDouble, Scissors, BarChart3, Video, FileText, TrendingUp,
  UserCog, ChevronLeft, Search, Command,
} from 'lucide-react'
import { isAuthenticated, clearAuth, getUser, getTenant } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { authApi } from '@/lib/api'
import { useBillingStatus } from '@/hooks/useBillingStatus'
import CommandPalette from '@/components/CommandPalette'
import Cookies from 'js-cookie'

const navItems = [
  { href: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/agenda',        label: 'Agenda',        icon: Calendar },
  { href: '/patients',      label: 'Pacientes',     icon: PawPrint },
  { href: '/tutores',       label: 'Tutores',       icon: Users },
  { href: '/vaccines',      label: 'Vacinas',       icon: Syringe },
  { href: '/internacoes',   label: 'Internação',    icon: BedDouble },
  { href: '/banho-tosa',    label: 'Banho & Tosa',  icon: Scissors },
  { href: '/financeiro',    label: 'Financeiro',    icon: DollarSign },
  { href: '/relatorios',    label: 'Relatórios',    icon: BarChart3 },
  { href: '/comissoes',     label: 'Comissões',     icon: TrendingUp },
  { href: '/telemedicina',  label: 'Telemedicina',  icon: Video },
  { href: '/nfe',           label: 'Notas Fiscais', icon: FileText },
  { href: '/funcionarios',  label: 'Funcionários',  icon: UserCog },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [tenant, setTenant] = useState<any>(null)
  const { data: billing } = useBillingStatus()

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return }
    setUser(getUser())
    setTenant(getTenant())
    // Restaurar estado colapsado
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  function toggleCollapse() {
    setCollapsed((c) => {
      localStorage.setItem('sidebar-collapsed', String(!c))
      return !c
    })
  }

  async function handleLogout() {
    const refreshToken = Cookies.get('refreshToken')
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {})
    clearAuth()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Command Palette (global) ────────────────────────── */}
      <CommandPalette />

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 flex flex-col',
          'transition-all duration-300 ease-in-out',
          'lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'w-[68px]' : 'w-64',
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center h-16 border-b border-gray-100 flex-shrink-0 transition-all duration-300',
          collapsed ? 'px-4 justify-center' : 'px-5 gap-3',
        )}>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <PawPrint className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <p className="font-bold text-gray-900 truncate text-sm">{tenant?.name || 'VetCare'}</p>
              <p className="text-xs text-gray-400">Sistema Veterinário</p>
            </div>
          )}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          <div className={cn('space-y-0.5', collapsed ? 'px-2' : 'px-3')}>
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 group relative',
                    collapsed ? 'px-2.5 py-2.5 justify-center' : 'px-3 py-2.5',
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  <item.icon className={cn('flex-shrink-0 transition-transform duration-150 group-hover:scale-110', active ? 'w-4 h-4' : 'w-4 h-4')} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {active && <ChevronRight className="w-3 h-3 ml-auto opacity-70" />}
                    </>
                  )}
                  {/* Tooltip quando colapsado */}
                  {collapsed && (
                    <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                      {item.label}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Footer do sidebar */}
        <div className="border-t border-gray-100 p-3">
          {!collapsed ? (
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
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition p-1 rounded-lg hover:bg-red-50" title="Sair">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition p-2 rounded-xl hover:bg-red-50" title="Sair">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
          {/* Mobile menu */}
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition">
            <Menu className="w-5 h-5" />
          </button>

          {/* Collapse toggle (desktop) */}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          >
            <ChevronLeft className={cn('w-4 h-4 transition-transform duration-300', collapsed && 'rotate-180')} />
          </button>

          {/* Command Palette trigger */}
          <button
            onClick={() => {
              const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
              window.dispatchEvent(e)
            }}
            className="hidden sm:flex items-center gap-2 flex-1 max-w-xs px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-400 transition cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Buscar ou navegar...</span>
            <div className="ml-auto flex items-center gap-0.5 text-xs opacity-60">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Banners de billing */}
        {billing?.status === 'TRIAL' && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between text-sm flex-shrink-0">
            <span className="text-amber-800">
              Período de teste: <strong>{billing.trialDaysRemaining} dia(s) restante(s)</strong>
            </span>
            <Link href="/assinar" className="font-semibold underline text-amber-700 hover:text-amber-900 ml-4">Assinar agora</Link>
          </div>
        )}
        {billing?.status === 'PAST_DUE' && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-2 flex items-center justify-between text-sm flex-shrink-0">
            <span className="text-red-800"><strong>Pagamento em atraso</strong> — regularize para manter o acesso.</span>
            <Link href="/configuracoes/billing" className="font-semibold underline text-red-700 hover:text-red-900 ml-4">Ver cobrança</Link>
          </div>
        )}

        {/* Conteúdo */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
