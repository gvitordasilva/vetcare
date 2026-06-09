'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PawPrint, Menu, X } from 'lucide-react'

export default function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shadow-md group-hover:bg-green-700 transition">
              <PawPrint className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-xl tracking-tight">VetCare</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {[
              { href: '#funcionalidades', label: 'Funcionalidades' },
              { href: '#como-funciona', label: 'Como funciona' },
              { href: '#video', label: 'Demo' },
              { href: '/pricing', label: 'Preços' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 transition"
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
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3">
            {[
              { href: '#funcionalidades', label: 'Funcionalidades' },
              { href: '#como-funciona', label: 'Como funciona' },
              { href: '#video', label: 'Demo' },
              { href: '/pricing', label: 'Preços' },
              { href: '/login', label: 'Entrar' },
            ].map((item) => (
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
