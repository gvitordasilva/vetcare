'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, X, PawPrint } from 'lucide-react'

/**
 * StickyCta — pill flutuante que aparece após 600px de scroll
 * Inspirado no Mama Joyce Peppa Sauce: CTA sempre visível enquanto o
 * usuário navega pela landing page.
 */
export default function StickyCta() {
  const [show, setShow]           = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (dismissed || !show) return null

  return (
    <>
      <style>{`
        @keyframes stickyCtaIn {
          from { opacity: 0; transform: translateX(-50%) translateY(64px) scale(0.9); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1);  }
        }
      `}</style>

      <div
        className="fixed bottom-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(2,10,5,0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'stickyCtaIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}
      >
        {/* Ícone */}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(22,163,74,0.15)' }}>
          <PawPrint className="w-4 h-4 text-green-400" />
        </div>

        {/* Texto */}
        <span className="text-sm font-medium whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Teste <strong className="text-white">14 dias grátis</strong> — sem cartão
        </span>

        {/* CTA */}
        <Link
          href="/register"
          className="flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.04] active:scale-95 whitespace-nowrap"
          style={{ background: 'linear-gradient(135deg, #16a34a 0%, #0d9488 100%)' }}
        >
          Começar agora
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-0.5 transition"
          style={{ color: 'rgba(255,255,255,0.25)' }}
          aria-label="Fechar"
          onMouseOver={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
          onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </>
  )
}
