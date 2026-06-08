'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Zap, Building2, ArrowRight, MessageCircle } from 'lucide-react'

const PRICES = {
  PRO:        { monthly: 197,  annual: Math.round(197  * 12 * 0.8) },
  ENTERPRISE: { monthly: 497,  annual: Math.round(497  * 12 * 0.8) },
}

const PRO_FEATURES = [
  'Até 15 usuários (staff)',
  'Até 2.000 pacientes',
  'Até 500 agendamentos/mês',
  'Prontuário eletrônico completo',
  'AI Scribe — transcrição de consultas',
  'Telemedicina integrada',
  'NF-e e NFS-e',
  'Internação hospitalar',
  'Relatórios financeiros',
  'Suporte por email',
]

const ENTERPRISE_FEATURES = [
  'Usuários ilimitados',
  'Pacientes ilimitados',
  'Agendamentos ilimitados',
  'Tudo do plano PRO',
  'Acesso prioritário a novos módulos',
  'Suporte prioritário',
]

const FAQS = [
  {
    q: 'Preciso de cartão de crédito para o trial?',
    a: 'Não. O período de teste de 14 dias é totalmente gratuito, sem necessidade de cadastrar cartão.',
  },
  {
    q: 'Como funciona o pagamento?',
    a: 'Aceitamos PIX, boleto bancário e cartão de crédito. A cobrança é recorrente (mensal ou anual).',
  },
  {
    q: 'Posso cancelar a qualquer momento?',
    a: 'Sim. O cancelamento é imediato e você continua com acesso até o fim do período já pago.',
  },
  {
    q: 'Meus dados ficam no Brasil?',
    a: 'Sim. Todos os dados são armazenados em servidores no Brasil, em conformidade com a LGPD.',
  },
  {
    q: 'O que acontece se eu atingir os limites do plano PRO?',
    a: 'Você receberá um aviso e poderá fazer upgrade para o Enterprise a qualquer momento. Dados existentes nunca são perdidos.',
  },
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-700">
          <Zap className="w-6 h-6" />
          VetCare
        </Link>
        <div className="flex gap-3">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2">
            Já tenho conta
          </Link>
          <Link
            href="/register"
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            Começar grátis
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="text-center pt-16 pb-10 px-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
          <Zap className="w-3.5 h-3.5" />
          14 dias grátis — sem cartão de crédito
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Gestão veterinária<br />simples e completa
        </h1>
        <p className="text-lg text-gray-500 mb-8">
          Prontuário, agendamentos, vacinas, financeiro, NF-e e muito mais.
          Experimente por 14 dias sem compromisso.
        </p>

        {/* Toggle mensal/anual */}
        <div className="inline-flex items-center gap-3 bg-gray-100 rounded-lg p-1 mb-10">
          <button
            onClick={() => setAnnual(false)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              !annual ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              annual ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Anual
            <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
              -20%
            </span>
          </button>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
          {/* PRO */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">PRO</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">Para clínicas pequenas e médias</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">
                R${annual
                  ? Math.round(PRICES.PRO.annual / 12).toLocaleString('pt-BR')
                  : PRICES.PRO.monthly.toLocaleString('pt-BR')}
              </span>
              <span className="text-gray-400 text-sm ml-1">/mês</span>
              {annual && (
                <p className="text-xs text-green-600 mt-1">
                  R${PRICES.PRO.annual.toLocaleString('pt-BR')}/ano — economize
                  R${(PRICES.PRO.monthly * 12 - PRICES.PRO.annual).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
            <Link
              href="/register"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm mb-6 transition-colors"
            >
              Experimentar grátis <ArrowRight className="w-4 h-4" />
            </Link>
            <ul className="space-y-2.5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* ENTERPRISE */}
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
              MAIS POPULAR
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-white">ENTERPRISE</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">Para grandes clínicas e redes</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">
                R${annual
                  ? Math.round(PRICES.ENTERPRISE.annual / 12).toLocaleString('pt-BR')
                  : PRICES.ENTERPRISE.monthly.toLocaleString('pt-BR')}
              </span>
              <span className="text-gray-400 text-sm ml-1">/mês</span>
              {annual && (
                <p className="text-xs text-green-400 mt-1">
                  R${PRICES.ENTERPRISE.annual.toLocaleString('pt-BR')}/ano — economize
                  R${(PRICES.ENTERPRISE.monthly * 12 - PRICES.ENTERPRISE.annual).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
            <Link
              href="/register"
              className="w-full flex items-center justify-center gap-2 bg-amber-400 text-gray-900 px-4 py-2.5 rounded-lg hover:bg-amber-300 font-medium text-sm mb-6 transition-colors"
            >
              Experimentar grátis <ArrowRight className="w-4 h-4" />
            </Link>
            <ul className="space-y-2.5">
              {ENTERPRISE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                  <Check className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Perguntas frequentes</h2>
        <div className="space-y-5">
          {FAQS.map((faq) => (
            <div key={faq.q} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-1.5 flex items-start gap-2">
                <MessageCircle className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                {faq.q}
              </h3>
              <p className="text-sm text-gray-500 pl-6">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-blue-600 py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Pronto para experimentar?</h2>
        <p className="text-blue-100 mb-8">14 dias grátis, sem cartão de crédito.</p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
        >
          Criar conta agora <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  )
}
