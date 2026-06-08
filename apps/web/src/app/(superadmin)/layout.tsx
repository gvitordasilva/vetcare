'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, LayoutDashboard, Building2, LogOut, Menu, X, ChevronRight } from 'lucide-react'
import { isSuperAdminAuthenticated, clearSuperAdminAuth, getSuperAdmin } from '@/lib/superadmin-api'
import { cn } from '@/lib/utils'
import Cookies from 'js-cookie'

const navItems = [
  { href: '/superadmin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/superadmin/tenants', label: 'Clínicas', icon: Building2 },
]

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sa, setSa] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Allow access to login page without auth
    if (pathname === '/superadmin/login' || pathname.startsWith('/superadmin/login')) return
    if (!isSuperAdminAuthenticated()) {
      router.push('/superadmin/login')
      return
    }
    setSa(getSuperAdmin())
  }, [pathname])

  // Render login without shell
  if (pathname.startsWith('/superadmin/login')) return <>{children}</>

  function handleLogout() {
    clearSuperAdminAuth()
    router.push('/superadmin/login')
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300',
        'lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">VetCare Admin</p>
            <p className="text-xs text-slate-400">Plataforma</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-900/40'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-900 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-violet-300 font-semibold text-sm">{sa?.name?.charAt(0)}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{sa?.name}</p>
              <p className="text-xs text-slate-400">Super Admin</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition" title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="ml-4 lg:ml-0">
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Administração da Plataforma</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  )
}
