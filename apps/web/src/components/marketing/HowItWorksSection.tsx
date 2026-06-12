'use client'

import { useEffect, useRef, useState } from 'react'
import { UserPlus, Settings, TrendingUp, ArrowRight } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Crie sua conta',
    description: 'Cadastre sua clínica em 2 minutos. Sem burocracia, sem cartão de crédito. Seu trial de 14 dias começa imediatamente.',
    lightColor: 'bg-green-50 text-green-600',
    dotColor: '#16a34a',
  },
  {
    number: '02',
    icon: Settings,
    title: 'Configure sua clínica',
    description: 'Adicione sua equipe, horários de atendimento, serviços e tabela de preços. O assistente guia cada passo.',
    lightColor: 'bg-blue-50 text-blue-600',
    dotColor: '#2563eb',
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'Comece a crescer',
    description: 'Atenda seus pacientes, receba pagamentos, emita NF-e e acompanhe seus resultados em tempo real.',
    lightColor: 'bg-purple-50 text-purple-600',
    dotColor: '#9333ea',
  },
]

// Centros das 3 colunas no viewBox 1000x60 (grid lg:grid-cols-3)
const DOT_X = [167, 500, 833]

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const pathRef    = useRef<SVGPathElement>(null)
  const [progress, setProgress] = useState(0)
  const [pathLen, setPathLen]   = useState(0)
  const [cardsVisible, setCardsVisible] = useState(false)

  /* Comprimento real do path (uma vez) */
  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength())
  }, [])

  /* Linha se desenha conforme a seção atravessa o viewport */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(1)
      setCardsVisible(true)
      return
    }

    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        const el = sectionRef.current
        if (el) {
          const rect = el.getBoundingClientRect()
          const vh = window.innerHeight
          // Começa quando o topo da seção atinge 85% do viewport;
          // completa quando atinge ~30% — janela de ~55% de viewport.
          const p = (vh * 0.85 - rect.top) / (vh * 0.55)
          setProgress(Math.max(0, Math.min(1, p)))
        }
        raf = 0
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  /* Reveal dos cards */
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCardsVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Dots acendem conforme a linha passa por eles
  const dotThresholds = [0.12, 0.55, 0.95]

  return (
    <section id="como-funciona" ref={sectionRef} className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-green-600 text-sm font-semibold bg-green-50 px-4 py-2 rounded-full mb-4">
            Simples assim
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Do zero ao funcionando em minutos
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Sem instalação, sem servidor, sem TI. Acesse de qualquer dispositivo, de qualquer lugar.
          </p>
        </div>

        {/* ── Linha conectora SVG (só desktop) ───────────────────────── */}
        <div className="hidden lg:block relative h-14 -mb-7 z-10 pointer-events-none">
          <svg
            viewBox="0 0 1000 60"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
            aria-hidden
          >
            {/* Trilho de fundo */}
            <path
              d="M 167 30 C 280 8, 380 52, 500 30 S 720 8, 833 30"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="2"
              strokeDasharray="4 6"
            />
            {/* Linha que se desenha (stroke-dashoffset dirigido pelo scroll) */}
            <path
              ref={pathRef}
              d="M 167 30 C 280 8, 380 52, 500 30 S 720 8, 833 30"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={pathLen || 1}
              strokeDashoffset={pathLen ? pathLen * (1 - progress) : 1}
            />
            {/* Dots dos steps */}
            {DOT_X.map((x, i) => {
              const lit = progress >= dotThresholds[i]
              return (
                <g key={x}>
                  <circle
                    cx={x} cy="30" r="9"
                    fill={lit ? steps[i].dotColor : '#fff'}
                    opacity={lit ? 0.18 : 1}
                    style={{ transition: 'fill 0.4s ease, opacity 0.4s ease' }}
                  />
                  <circle
                    cx={x} cy="30" r="5"
                    fill={lit ? steps[i].dotColor : '#d1d5db'}
                    style={{ transition: 'fill 0.4s ease' }}
                  />
                </g>
              )
            })}
          </svg>
        </div>

        {/* ── Steps ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 lg:pt-12">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="transition-all duration-700"
              style={{
                opacity: cardsVisible ? 1 : 0,
                transform: cardsVisible ? 'translateX(0)' : 'translateX(-32px)',
                transitionDelay: `${index * 150}ms`,
                transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <div className="h-full bg-gray-50 rounded-3xl p-8 border border-gray-100 hover:border-green-200 hover:shadow-lg hover:shadow-green-50 hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-2xl ${step.lightColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span className="text-5xl font-black text-gray-100 group-hover:text-gray-200 transition-colors">
                    {step.number}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-500 text-sm mb-4">Pronto para começar? São apenas 14 dias de diferença.</p>
          <a
            href="/register"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Criar minha conta grátis
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  )
}
