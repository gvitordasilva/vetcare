'use client'

import { useEffect, useRef } from 'react'

/**
 * PawCursor — substitui o cursor padrão por uma patinha verde no site
 * Só ativa em dispositivos com mouse (pointer: fine); tablets/mobile ficam normais.
 *
 * Também gerencia o título da aba:
 *   — ao sair: "🐾 Seus pacientes te esperam..."
 *   — ao voltar: "👋 Olá de volta! · VetCare" por 2.5s, depois restaura
 */
export default function PawCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(pointer: fine)').matches) return

    /* ── Esconder cursor padrão em toda a página ─────────────────── */
    const styleEl = document.createElement('style')
    styleEl.id = 'paw-cursor-style'
    styleEl.textContent = 'html, html * { cursor: none !important; }'
    document.head.appendChild(styleEl)

    /* ── Seguir o mouse ──────────────────────────────────────────── */
    const onMove = (e: MouseEvent) => {
      const el = cursorRef.current
      if (!el) return
      el.style.transform = `translate(${e.clientX - 20}px, ${e.clientY - 20}px)`
      el.style.opacity = '0.9'
    }

    /* ── Sumir quando sai da janela ──────────────────────────────── */
    const onLeave = () => { if (cursorRef.current) cursorRef.current.style.opacity = '0' }
    const onEnter = () => { if (cursorRef.current) cursorRef.current.style.opacity = '0.9' }

    /* ── Título da aba ───────────────────────────────────────────── */
    const origTitle = document.title
    let restoreTimer: ReturnType<typeof setTimeout>

    const onVis = () => {
      clearTimeout(restoreTimer)
      if (document.hidden) {
        document.title = '🐾 Seus pacientes te esperam...'
      } else {
        document.title = '👋 Olá de volta! · VetCare'
        restoreTimer = setTimeout(() => { document.title = origTitle }, 2500)
      }
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    document.documentElement.addEventListener('mouseleave', onLeave)
    document.documentElement.addEventListener('mouseenter', onEnter)
    document.addEventListener('visibilitychange', onVis)

    return () => {
      clearTimeout(restoreTimer)
      document.getElementById('paw-cursor-style')?.remove()
      window.removeEventListener('mousemove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      document.documentElement.removeEventListener('mouseenter', onEnter)
      document.removeEventListener('visibilitychange', onVis)
      document.title = origTitle
    }
  }, [])

  return (
    <div
      ref={cursorRef}
      aria-hidden
      className="fixed top-0 left-0 pointer-events-none z-[9999] select-none"
      style={{ width: 40, height: 40, opacity: 0, willChange: 'transform', transition: 'opacity 0.15s ease' }}
    >
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        {/* Palma central */}
        <ellipse cx="50" cy="67" rx="23" ry="19" fill="#16a34a" />
        {/* Textura da palma */}
        <ellipse cx="50" cy="67" rx="14" ry="10.5" fill="rgba(0,0,0,0.1)" />
        {/* Dedos */}
        <ellipse cx="21" cy="40" rx="10" ry="13" transform="rotate(-18 21 40)" fill="#16a34a" />
        <ellipse cx="38" cy="29" rx="10" ry="13" transform="rotate(-6 38 29)"  fill="#16a34a" />
        <ellipse cx="57" cy="29" rx="10" ry="13" transform="rotate(6 57 29)"   fill="#16a34a" />
        <ellipse cx="74" cy="40" rx="10" ry="13" transform="rotate(18 74 40)"  fill="#16a34a" />
      </svg>
    </div>
  )
}
