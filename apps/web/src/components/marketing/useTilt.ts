'use client'

import { useEffect, useRef } from 'react'

type TiltOptions = {
  maxRotX?: number   // graus máximos no eixo X (vertical do mouse)
  maxRotY?: number   // graus máximos no eixo Y (horizontal do mouse)
  scale?: number     // escala enquanto hover (1 = sem zoom)
  lerp?: number      // fator de interpolação por frame (0..1)
}

/**
 * Tilt 3D com lerp em rAF. O loop só roda enquanto há hover ou enquanto
 * o valor ainda não convergiu — custo zero em idle. Desativado em touch
 * (pointer: coarse) e prefers-reduced-motion.
 */
export default function useTilt<T extends HTMLElement = HTMLDivElement>(
  { maxRotX = 5, maxRotY = 7, scale = 1, lerp = 0.08 }: TiltOptions = {},
) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(pointer: fine)').matches) return

    let raf = 0
    let tx = 0, ty = 0, ts = 1   // alvos: rotateY, rotateX, scale
    let cx = 0, cy = 0, cs = 1   // valores atuais
    let hovering = false

    const loop = () => {
      cx += (tx - cx) * lerp
      cy += (ty - cy) * lerp
      cs += (ts - cs) * lerp
      el.style.transform =
        `perspective(1100px) rotateX(${cy.toFixed(2)}deg) rotateY(${cx.toFixed(2)}deg) scale(${cs.toFixed(3)})`
      if (hovering || Math.abs(tx - cx) > 0.02 || Math.abs(ty - cy) > 0.02 || Math.abs(ts - cs) > 0.002) {
        raf = requestAnimationFrame(loop)
      } else {
        raf = 0
      }
    }
    const ensureLoop = () => { if (!raf) raf = requestAnimationFrame(loop) }

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      tx = ((e.clientX - r.left) / r.width - 0.5) * maxRotY * 2
      ty = -((e.clientY - r.top) / r.height - 0.5) * maxRotX * 2
      ts = scale
      hovering = true
      ensureLoop()
    }
    const onLeave = () => {
      tx = 0; ty = 0; ts = 1
      hovering = false
      ensureLoop()
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [maxRotX, maxRotY, scale, lerp])

  return ref
}
