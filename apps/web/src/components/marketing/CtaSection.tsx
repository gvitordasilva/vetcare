import Link from 'next/link'
import { ArrowRight, PawPrint } from 'lucide-react'

export default function CtaSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 blur-3xl" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Icon */}
        <div className="inline-flex w-16 h-16 rounded-2xl bg-white/20 items-center justify-center mb-6 backdrop-blur-sm">
          <PawPrint className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
          Pronto para modernizar<br />sua clínica?
        </h2>
        <p className="text-lg text-green-100 mb-10 max-w-xl mx-auto leading-relaxed">
          Comece hoje com 14 dias grátis. Sem cartão de crédito, sem burocracia.
          Se gostar, escolha um plano. Se não, cancele sem custo.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-green-700 font-bold px-10 py-4 rounded-2xl shadow-2xl hover:bg-green-50 transition-all duration-200 text-base hover:scale-105"
          >
            Criar conta grátis — 14 dias
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-white font-semibold px-8 py-4 rounded-2xl border border-white/30 hover:bg-white/10 transition-all duration-200 text-base"
          >
            Ver planos e preços
          </Link>
        </div>

        <p className="mt-6 text-green-200 text-sm">
          Sem cartão · Cancele quando quiser · Suporte em português
        </p>
      </div>
    </section>
  )
}
