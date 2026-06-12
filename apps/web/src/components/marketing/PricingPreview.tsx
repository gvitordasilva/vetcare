'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ArrowRight, Zap, Building2 } from 'lucide-react'

const plans = [
  {
    name: 'PRO',
    icon: Zap,
    monthly: 197,
    annual: 157,
    description: 'Ideal para clínicas em crescimento',
    highlights: [
      'Até 15 usuários',
      'Até 2.000 pacientes',
      '500 consultas/mês',
      'Todos os módulos',
      'Suporte por email',
    ],
    cta: 'Começar grátis',
    ctaHref: '/register',
    featured: false,
    badge: null as string | null,
  },
  {
    name: 'ENTERPRISE',
    icon: Building2,
    monthly: 497,
    annual: 397,
    description: 'Para clínicas e redes sem limites',
    highlights: [
      'Usuários ilimitados',
      'Pacientes ilimitados',
      'Consultas ilimitadas',
      'Todos os módulos',
      'Suporte prioritário',
    ],
    cta: 'Começar grátis',
    ctaHref: '/register',
    featured: true,
    badge: 'Mais popular',
  },
]

/* ── Número que anima entre valores (rAF, easeOutCubic) ────────────── */
function PriceNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }
    const from = display
    if (from === value) return
    let raf = 0
    const t0 = performance.now()
    const dur = 380
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <span className="tabular-nums">{display}</span>
}

export default function PricingPreview() {
  const [annual, setAnnual] = useState(true)

  return (
    <section className="py-24 bg-gray-50">
      <style>{`
        @keyframes pricingHue {
          0%, 100% { filter: hue-rotate(0deg); }
          50%       { filter: hue-rotate(35deg); }
        }
        .pricing-glow-border { animation: pricingHue 8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .pricing-glow-border { animation: none; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 text-sm font-semibold px-4 py-2 rounded-full mb-4">
            💳 14 dias grátis em todos os planos
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Preços simples e transparentes
          </h2>
          <p className="text-lg text-gray-500">
            Sem taxas ocultas. Cancele a qualquer momento.
          </p>
        </div>

        {/* ── Toggle mensal/anual ──────────────────────────────────── */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="relative flex items-center bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
            {/* Thumb deslizante */}
            <span
              className="absolute top-1 bottom-1 rounded-xl bg-gray-900 transition-all duration-300 ease-out"
              style={{
                left: annual ? 'calc(50% - 2px)' : '4px',
                width: 'calc(50% - 2px)',
              }}
            />
            <button
              onClick={() => setAnnual(false)}
              className={`relative z-10 px-5 py-2 text-sm font-semibold rounded-xl transition-colors duration-300 ${
                !annual ? 'text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`relative z-10 px-5 py-2 text-sm font-semibold rounded-xl transition-colors duration-300 ${
                annual ? 'text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Anual
            </button>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-1.5 rounded-full transition-all duration-300 ${
              annual ? 'bg-green-100 text-green-700 scale-100' : 'bg-gray-100 text-gray-400 scale-95'
            }`}
          >
            −20%
          </span>
        </div>

        {/* ── Cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 items-stretch">
          {plans.map((plan) => {
            const price = annual ? plan.annual : plan.monthly

            const cardInner = (
              <div
                className={`relative h-full rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 ${
                  plan.featured
                    ? 'bg-gray-900 hover:shadow-2xl hover:shadow-green-900/30'
                    : 'bg-white border border-gray-200 hover:border-green-200 hover:shadow-xl'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
                    {plan.badge}
                  </span>
                )}

                {/* Ícone + nome */}
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.featured ? 'bg-white/10' : 'bg-green-50'}`}>
                    <plan.icon className={`w-5 h-5 ${plan.featured ? 'text-white' : 'text-green-600'}`} />
                  </div>
                  <div>
                    <h3 className={`font-bold text-lg ${plan.featured ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                    <p className={`text-xs ${plan.featured ? 'text-gray-400' : 'text-gray-500'}`}>{plan.description}</p>
                  </div>
                </div>

                {/* Preço animado */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-sm font-medium ${plan.featured ? 'text-gray-400' : 'text-gray-500'}`}>R$</span>
                    <span className={`text-5xl font-black ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                      <PriceNumber value={price} />
                    </span>
                    <span className={`text-sm ${plan.featured ? 'text-gray-400' : 'text-gray-500'}`}>/mês</span>
                  </div>
                  <p className={`text-xs mt-1 transition-opacity duration-300 ${plan.featured ? 'text-green-400' : 'text-green-600'}`}>
                    {annual
                      ? `Cobrança anual — economia de R$ ${(plan.monthly - plan.annual) * 12}/ano`
                      : `ou R$ ${plan.annual}/mês no plano anual (−20%)`}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.highlights.map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${plan.featured ? 'text-green-400' : 'text-green-500'}`} />
                      <span className={`text-sm ${plan.featured ? 'text-gray-300' : 'text-gray-600'}`}>{item}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={plan.ctaHref}
                  className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 ${
                    plan.featured
                      ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/40'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )

            // Card "Mais popular": wrapper com border gradient animada
            return plan.featured ? (
              <div
                key={plan.name}
                className="pricing-glow-border rounded-[26px] p-[2px]"
                style={{
                  background: 'linear-gradient(135deg, #16a34a, #0d9488 35%, #7c3aed 70%, #16a34a)',
                }}
              >
                {cardInner}
              </div>
            ) : (
              <div key={plan.name}>{cardInner}</div>
            )
          })}
        </div>

        {/* Link comparação */}
        <div className="text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold text-sm"
          >
            Ver comparação completa dos planos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
