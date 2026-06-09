import Link from 'next/link'
import { CheckCircle2, ArrowRight, Zap, Building2 } from 'lucide-react'

const plans = [
  {
    name: 'PRO',
    icon: Zap,
    price: 197,
    annualPrice: 157,
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
    badge: null,
  },
  {
    name: 'ENTERPRISE',
    icon: Building2,
    price: 497,
    annualPrice: 397,
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

export default function PricingPreview() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 text-sm font-semibold px-4 py-2 rounded-full mb-4">
            💳 14 dias grátis em todos os planos
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Preços simples e transparentes
          </h2>
          <p className="text-lg text-gray-500">
            Sem taxas ocultas. Cancele a qualquer momento.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-8 border transition-all duration-200 ${
                plan.featured
                  ? 'bg-gray-900 border-gray-800 shadow-2xl'
                  : 'bg-white border-gray-200 hover:border-green-200 hover:shadow-lg'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}

              {/* Plan icon + name */}
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.featured ? 'bg-white/10' : 'bg-green-50'}`}>
                  <plan.icon className={`w-5 h-5 ${plan.featured ? 'text-white' : 'text-green-600'}`} />
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${plan.featured ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                  <p className={`text-xs ${plan.featured ? 'text-gray-400' : 'text-gray-500'}`}>{plan.description}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className={`text-sm font-medium ${plan.featured ? 'text-gray-400' : 'text-gray-500'}`}>R$</span>
                  <span className={`text-5xl font-black ${plan.featured ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                  <span className={`text-sm ${plan.featured ? 'text-gray-400' : 'text-gray-500'}`}>/mês</span>
                </div>
                <p className={`text-xs mt-1 ${plan.featured ? 'text-green-400' : 'text-green-600'}`}>
                  ou R${plan.annualPrice}/mês no plano anual (−20%)
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
          ))}
        </div>

        {/* Link to full pricing */}
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
