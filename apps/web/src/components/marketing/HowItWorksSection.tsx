import { UserPlus, Settings, TrendingUp, ArrowRight } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Crie sua conta',
    description: 'Cadastre sua clínica em 2 minutos. Sem burocracia, sem cartão de crédito. Seu trial de 14 dias começa imediatamente.',
    color: 'bg-green-600',
    lightColor: 'bg-green-50 text-green-600',
  },
  {
    number: '02',
    icon: Settings,
    title: 'Configure sua clínica',
    description: 'Adicione sua equipe, horários de atendimento, serviços e tabela de preços. O assistente guia cada passo.',
    color: 'bg-blue-600',
    lightColor: 'bg-blue-50 text-blue-600',
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'Comece a crescer',
    description: 'Atenda seus pacientes, receba pagamentos, emita NF-e e acompanhe seus resultados em tempo real.',
    color: 'bg-purple-600',
    lightColor: 'bg-purple-50 text-purple-600',
  },
]

export default function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-green-600 text-sm font-semibold bg-green-50 px-4 py-2 rounded-full mb-4">
            Simples assim
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Do zero ao funcionando em minutos
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Sem instalação, sem servidor, sem TI. Acesse de qualquer dispositivo, de qualquer lugar.
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex flex-col lg:flex-row items-start gap-4 flex-1">
              {/* Step card */}
              <div className="w-full bg-gray-50 rounded-3xl p-8 border border-gray-100 hover:border-green-200 hover:shadow-lg hover:shadow-green-50 transition-all duration-200 group">
                {/* Number + Icon */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-2xl ${step.lightColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span className="text-5xl font-black text-gray-100">{step.number}</span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.description}</p>
              </div>

              {/* Arrow between steps */}
              {index < steps.length - 1 && (
                <div className="hidden lg:flex items-center justify-center w-8 mt-16 flex-shrink-0">
                  <ArrowRight className="w-6 h-6 text-gray-300" />
                </div>
              )}
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
