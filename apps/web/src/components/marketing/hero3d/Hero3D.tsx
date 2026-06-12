'use client'

import { Component, type ReactNode, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ANIMAL_MODELS } from './animalConfig'
import type { MouseRef } from './AnimalScene'

/* three.js/R3F só entram no bundle quando os gates passam (ssr: false +
   import dinâmico) — o chunk 3D não pesa no First Load das demais rotas */
const AnimalScene = dynamic(() => import('./AnimalScene'), { ssr: false })

/* ── Error boundary: qualquer falha de WebGL/modelo → fallback ─────── */
class GLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

type Hero3DProps = {
  speciesId: string
  /** Renderizado enquanto o 3D não está pronto e em dispositivos sem suporte */
  fallback: ReactNode
}

/**
 * Orquestra os gates de capacidade antes de montar o canvas:
 *  1. prefers-reduced-motion → mantém float/follow desligados (cena estática)
 *  2. pointer: coarse (mobile/tablet) → fallback (mockup), sem 3D
 *  3. GPU tier (detect-gpu): 0 → fallback · 1 → dpr 1 sem env · 2+ → completo
 *  4. HEAD request por modelo: espécies sem GLB publicado ficam de fora e o
 *     hero segue no último animal disponível (auto-ativa quando o arquivo subir)
 */
export default function Hero3D({ speciesId, fallback }: Hero3DProps) {
  const [gpuTier, setGpuTier]       = useState<number | null>(null)
  const [available, setAvailable]   = useState<Record<string, boolean> | null>(null)
  const [ready, setReady]           = useState(false)
  const [inView, setInView]         = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isDesktop, setIsDesktop]   = useState<boolean | null>(null)

  const wrapRef = useRef<HTMLDivElement>(null)
  const mouse: MouseRef = useRef({ x: 0 })

  /* Gates síncronos */
  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    setIsDesktop(window.matchMedia('(pointer: fine)').matches)
  }, [])

  /* GPU tier — import dinâmico para não entrar no bundle base */
  useEffect(() => {
    if (isDesktop !== true) return
    let alive = true
    import('detect-gpu')
      .then(({ getGPUTier }) => getGPUTier())
      .then((r) => { if (alive) setGpuTier(r.tier) })
      .catch(() => { if (alive) setGpuTier(0) })
    return () => { alive = false }
  }, [isDesktop])

  /* Disponibilidade dos GLBs (HEAD) — espécie sem modelo não quebra nada */
  useEffect(() => {
    if (isDesktop !== true) return
    let alive = true
    Promise.all(
      Object.entries(ANIMAL_MODELS).map(async ([id, cfg]) => {
        try {
          const res = await fetch(cfg.url, { method: 'HEAD' })
          return [id, res.ok] as const
        } catch {
          return [id, false] as const
        }
      }),
    ).then((entries) => {
      if (alive) setAvailable(Object.fromEntries(entries))
    })
    return () => { alive = false }
  }, [isDesktop])

  /* Mouse global (passivo) — só atualiza ref, sem re-render */
  useEffect(() => {
    if (isDesktop !== true) return
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [isDesktop])

  /* Pausa o render loop fora do viewport */
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const supported = isDesktop === true && gpuTier !== null && gpuTier >= 1 && available !== null
  const anyModel  = available ? Object.values(available).some(Boolean) : false

  /* Espécie efetiva: a pedida se tiver modelo; senão a última disponível */
  const lastShownRef = useRef<string | null>(null)
  let effective: string | null = null
  if (available) {
    if (available[speciesId]) effective = speciesId
    else if (lastShownRef.current && available[lastShownRef.current]) effective = lastShownRef.current
    else effective = Object.keys(ANIMAL_MODELS).find((id) => available[id]) ?? null
  }
  if (effective) lastShownRef.current = effective

  const show3D = supported && anyModel && effective !== null

  return (
    <div ref={wrapRef} className="relative w-full" style={{ minHeight: 480 }}>
      {/* Fallback (mockup) visível até o primeiro frame 3D estar pronto */}
      <div
        className="transition-opacity duration-700"
        style={{ opacity: show3D && ready ? 0 : 1, pointerEvents: show3D && ready ? 'none' : 'auto' }}
      >
        {fallback}
      </div>

      {show3D && (
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: ready ? 1 : 0 }}
          aria-hidden
        >
          <GLBoundary fallback={null}>
            <AnimalScene
              speciesId={effective!}
              gpuTier={gpuTier!}
              frameloop={inView ? 'always' : 'never'}
              mouse={mouse}
              reducedMotion={reducedMotion}
              onReady={() => setReady(true)}
            />
          </GLBoundary>
        </div>
      )}
    </div>
  )
}
