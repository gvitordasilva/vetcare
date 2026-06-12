'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { PawPrint, Menu, X } from 'lucide-react'

const NAV_ITEMS = [
  { href: '#funcionalidades', label: 'Funcionalidades' },
  { href: '#como-funciona',   label: 'Como funciona' },
  { href: '#video',           label: 'Demo' },
  { href: '/pricing',         label: 'Preços' },
]

export default function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  // Progresso 0→1 nos primeiros 120px de scroll: interpola blur, opacidade
  // do fundo e sombra — transição contínua em vez de liga/desliga.
  const [progress, setProgress] = useState(0)
  const rafRef = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        setProgress(Math.min(window.scrollY / 120, 1))
        rafRef.current = 0
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Hero é dark — texto claro no topo; vira escuro quando o vidro branco
  // fica opaco o suficiente para dar contraste.
  const onGlass = progress > 0.45

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: `rgba(255,255,255,${(progress * 0.92).toFixed(3)})`,
        backdropFilter: progress > 0.02 ? `blur(${(progress * 12).toFixed(1)}px)` : undefined,
        WebkitBackdropFilter: progress > 0.02 ? `blur(${(progress * 12).toFixed(1)}px)` : undefined,
        boxShadow: progress > 0.05 ? `0 1px 3px rgba(0,0,0,${(progress * 0.08).toFixed(3)})` : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shadow-md group-hover:bg-green-700 transition">
              <PawPrint className="w-5 h-5 text-white" />
            </div>
            <span className={`font-bold text-xl tracking-tight transition-colors duration-200 ${onGlass ? 'text-gray-900' : 'text-white'}`}>
              VetCare
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors duration-200 ${
                  onGlass ? 'text-gray-600 hover:text-gray-900' : 'text-white/60 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className={`text-sm font-medium px-3 py-2 transition-colors duration-200 ${
                onGlass ? 'text-gray-600 hover:text-gray-900' : 'text-white/70 hover:text-white'
              }`}
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              Teste grátis — 14 dias
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className={`md:hidden p-2 transition-colors duration-200 ${
              onGlass || menuOpen ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'
            }`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu — painel branco sólido independente do scroll */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3">
            {[...NAV_ITEMS, { href: '/login', label: 'Entrar' }].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-gray-700 py-2 border-b border-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/register"
              className="mt-2 bg-green-600 text-white text-sm font-semibold px-4 py-3 rounded-xl text-center"
              onClick={() => setMenuOpen(false)}
            >
              Teste grátis — 14 dias
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
