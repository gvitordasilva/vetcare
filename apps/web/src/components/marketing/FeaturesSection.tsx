import {
  ClipboardList, Calendar, DollarSign, Mic2,
  Video, BedDouble, Scissors, FileText,
  BarChart3, Bell,
} from 'lucide-react'

const features = [
  {
    icon: ClipboardList,
    title: 'Prontuário Eletrônico',
    description: 'Histórico completo do paciente, anamnese, exames e prescrições em um clique. Nunca perca um detalhe.',
    color: 'bg-blue-50 text-blue-600',
    badge: null,
  },
  {
    icon: Calendar,
    title: 'Agenda Inteligente',
    description: 'Agendamento online com confirmação automática por WhatsApp. Reduza faltas em até 40%.',
    color: 'bg-green-50 text-green-600',
    badge: null,
  },
  {
    icon: Mic2,
    title: 'AI Scribe',
    description: 'IA transcreve a consulta automaticamente e preenche o prontuário. Foque no animal, não no teclado.',
    color: 'bg-purple-50 text-purple-600',
    badge: 'Novidade',
  },
  {
    icon: DollarSign,
    title: 'Financeiro Completo',
    description: 'Fluxo de caixa, contas a receber, comissões de veterinários e relatórios de lucro por período.',
    color: 'bg-amber-50 text-amber-600',
    badge: null,
  },
  {
    icon: FileText,
    title: 'NF-e / NFS-e',
    description: 'Emissão automática de nota fiscal ao concluir atendimento. Integração com todas as prefeituras.',
    color: 'bg-red-50 text-red-600',
    badge: null,
  },
  {
    icon: Video,
    title: 'Telemedicina',
    description: 'Consultas por vídeo diretamente no sistema, com link enviado ao tutor automaticamente.',
    color: 'bg-cyan-50 text-cyan-600',
    badge: null,
  },
  {
    icon: BedDouble,
    title: 'Internação',
    description: 'Controle de leitos, prescrições hospitalares e evolução clínica para animais internados.',
    color: 'bg-indigo-50 text-indigo-600',
    badge: null,
  },
  {
    icon: Scissors,
    title: 'Banho & Tosa',
    description: 'Módulo completo para petshop integrado à clínica. Agendamentos e faturamento unificados.',
    color: 'bg-pink-50 text-pink-600',
    badge: null,
  },
  {
    icon: Bell,
    title: 'Lembretes Automáticos',
    description: 'Notificações de vacinas, retornos e consultas enviadas ao tutor por email. Zero esquecimentos.',
    color: 'bg-orange-50 text-orange-600',
    badge: null,
  },
  {
    icon: BarChart3,
    title: 'Relatórios Avançados',
    description: 'Dashboards com métricas de atendimento, receita, crescimento de pacientes e produtividade da equipe.',
    color: 'bg-teal-50 text-teal-600',
    badge: null,
  },
]

export default function FeaturesSection() {
  return (
    <section id="funcionalidades" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-green-600 text-sm font-semibold bg-green-50 px-4 py-2 rounded-full mb-4">
            Tudo que sua clínica precisa
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Uma plataforma, todas as funcionalidades
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Substitua 5 sistemas diferentes por um único — desenvolvido especificamente para clínicas veterinárias brasileiras.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative bg-white border border-gray-100 rounded-2xl p-5 hover:border-green-200 hover:shadow-lg hover:shadow-green-50 transition-all duration-200 cursor-default"
            >
              {feature.badge && (
                <span className="absolute -top-2.5 right-4 bg-green-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  {feature.badge}
                </span>
              )}
              <div className={`w-11 h-11 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1.5">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
