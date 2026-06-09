import Link from 'next/link'
import {
  ArrowRight, CheckCircle2, Star,
  Calendar, Users, FileText, Activity,
  TrendingUp, DollarSign,
} from 'lucide-react'

// Mini mockup do dashboard exibido à direita do hero
function DashboardMockup() {
  return (
    <div className="relative w-full max-w-xl mx-auto lg:mx-0">
      {/* Brilho de fundo */}
      <div className="absolute -inset-4 bg-gradient-to-br from-green-400/20 to-emerald-600/20 rounded-3xl blur-2xl" />

      {/* Janela do browser */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Chrome bar */}
        <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-white rounded-lg px-3 py-1 text-xs text-gray-400 ml-2">
            app.vetcare.com.br/dashboard
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-4 bg-gray-50">
          {/* Top nav mock */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <div className="text-xs font-medium text-gray-700">Clínica Pet Feliz</div>
            <div className="ml-auto text-xs text-gray-400">Hoje, 14:32</div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { icon: Calendar, label: 'Consultas hoje', value: '12', color: 'bg-blue-50 text-blue-600' },
              { icon: Users, label: 'Pacientes', value: '248', color: 'bg-green-50 text-green-600' },
              { icon: DollarSign, label: 'Receita mensal', value: 'R$8.4k', color: 'bg-purple-50 text-purple-600' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                <div className={`w-7 h-7 rounded-lg ${stat.color} flex items-center justify-center mb-1.5`}>
                  <stat.icon className="w-3.5 h-3.5" />
                </div>
                <div className="text-sm font-bold text-gray-900">{stat.value}</div>
                <div className="text-[10px] text-gray-400 leading-tight">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Agenda mini */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 mb-3">
            <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-green-600" />
              Próximas consultas
            </div>
            {[
              { pet: 'Thor (Golden)', owner: 'Ana Lima', time: '15:00', type: 'Consulta' },
              { pet: 'Mimi (Persa)', owner: 'João Silva', time: '15:30', type: 'Vacinação' },
            ].map((appt) => (
              <div key={appt.pet} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700 flex-shrink-0">
                  {appt.pet[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800 truncate">{appt.pet}</div>
                  <div className="text-[10px] text-gray-400">{appt.owner}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-gray-700">{appt.time}</div>
                  <div className="text-[10px] text-gray-400">{appt.type}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Chart bar mini */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Receita (últimos 7 dias)</span>
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            </div>
            <div className="flex items-end gap-1 h-10">
              {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm ${i === 5 ? 'bg-green-500' : 'bg-green-200'}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
                <span key={i} className="flex-1 text-center text-[9px] text-gray-400">{d}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Badge flutuante */}
      <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <Activity className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <div className="text-xs font-bold text-gray-900">AI Scribe ativo</div>
          <div className="text-[11px] text-gray-500">Transcrição em tempo real</div>
        </div>
      </div>

      <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <FileText className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <div className="text-xs font-bold text-gray-900">NF-e emitida</div>
          <div className="text-[11px] text-gray-500">Automaticamente</div>
        </div>
      </div>
    </div>
  )
}

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50 pt-16">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-green-200/30 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-200/30 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-xs font-semibold px-4 py-2 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Novo: AI Scribe — transcrição automática de consultas
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
              Gestão veterinária{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">
                moderna
              </span>{' '}
              para clínicas que crescem
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-lg">
              Prontuário digital, agendamento online, financeiro, telemedicina, NF-e e muito mais — tudo integrado, direto do seu navegador.
            </p>

            {/* Benefits */}
            <ul className="space-y-2.5 mb-10">
              {[
                '14 dias grátis, sem cartão de crédito',
                'PIX, boleto e cartão — 100% brasileiro',
                'Dados protegidos pelo LGPD no Brasil',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 rounded-2xl shadow-xl hover:shadow-green-200 hover:shadow-2xl transition-all duration-200 text-base"
              >
                Começar grátis agora
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 font-semibold px-8 py-4 rounded-2xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 text-base shadow-sm"
              >
                Ver planos e preços
              </Link>
            </div>

            {/* Social proof micro */}
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {['A', 'M', 'C', 'P', 'L'].map((initial, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                  >
                    {initial}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5 text-yellow-400 text-sm">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                </div>
                <p className="text-xs text-gray-500">+200 clínicas utilizam o VetCare</p>
              </div>
            </div>
          </div>

          {/* Right: Dashboard Mockup */}
          <div className="flex justify-center lg:justify-end">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
