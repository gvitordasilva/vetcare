'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { PawPrint, Home, FileText, DollarSign, LogOut, Calendar } from 'lucide-react'
import { isPortalAuthenticated, clearPortalAuth, getPortalOwner, portalAuthApi } from '@/lib/portal-api'
import Cookies from 'js-cookie'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/portal/meus-pets', label: 'Meus Pets',   icon: PawPrint },
  { href: '/portal/agendar',   label: 'Agendar',      icon: Calendar },
  { href: '/portal/cobrancas', label: 'Cobranças',    icon: DollarSign },
]

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [owner, setOwner]     = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isPortalAuthenticated() && pathname !== '/portal/login') {
      router.push('/portal/login')

      return
    }
    setOwner(getPortalOwner())
  }, [])

  async function handleLogout() {
    const refreshToken = Cookies.get('portalRefreshToken')
    if (refreshToken) await portalAuthApi.logout(refreshToken).catch(() => {})
    clearPortalAuth()
    router.push('/portal/login')
  }

  // Não renderiza layout nas páginas de auth
  if (pathname === '/portal/login') return <>{children}</>
  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <PawPrint className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{owner?.tenant?.name ?? 'VetCare'}</p>
              <p className="text-xs text-gray-400">Portal do Tutor</p>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  pathname === item.href
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{owner?.name}</p>
              <p className="text-xs text-gray-400">{owner?.email}</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition" title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="sm:hidden flex border-b border-gray-200 bg-white">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-all',
              pathname === item.href ? 'text-primary' : 'text-gray-500'
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
