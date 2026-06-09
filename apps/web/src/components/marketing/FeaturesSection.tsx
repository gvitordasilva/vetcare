import { ClipboardList, Calendar, DollarSign, Mic2, Video, BedDouble, Scissors, FileText, BarChart3, Bell, Zap, Shield } from 'lucide-react'

/* ── Bento grid — each item defines its own "span" ──────────────── */
const FEATURES = [
  {
    id: 'ai-scribe',
    icon: Mic2,
    title: 'AI Scribe',
    description: 'A IA transcreve a consulta em tempo real e preenche o prontuário automaticamente. Foque no animal, não no teclado.',
    badge: 'IA Nativa',
    badgeColor: 'bg-purple-500',
    col: 'md:col-span-2',
    row: '',
    accent: 'from-purple-500/10 to-purple-900/5',
    border: 'border-purple-500/20',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    large: true,
  },
  {
    id: 'prontuario',
    icon: ClipboardList,
    title: 'Prontuário Eletrônico',
    description: 'Histórico completo, anamnese, exames e prescrições.',
    badge: null, badgeColor: '', col: '', row: '',
    accent: 'from-blue-500/10 to-blue-900/5',
    border: 'border-blue-500/20',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    large: false,
  },
  {
    id: 'agenda',
    icon: Calendar,
    title: 'Agenda Inteligente',
    description: 'Agendamento online com confirmação automática.',
    badge: null, badgeColor: '', col: '', row: '',
    accent: 'from-green-500/10 to-green-900/5',
    border: 'border-green-500/20',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    large: false,
  },
  {
    id: 'financeiro',
    icon: DollarSign,
    title: 'Financeiro Completo',
    description: 'Fluxo de caixa, comissões e relatórios de lucro. Integrado com Asaas para cobranças automáticas.',
    badge: null, badgeColor: '', col: 'md:col-span-2', row: '',
    accent: 'from-amber-500/10 to-amber-900/5',
    border: 'border-amber-500/20',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    large: false,
  },
  {
    id: 'nfe',
    icon: FileText,
    title: 'NF-e / NFS-e',
    description: 'Emissão automática ao concluir atendimento.',
    badge: null, badgeColor: '', col: '', row: '',
    accent: 'from-red-500/10 to-red-900/5',
    border: 'border-red-500/20',
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    large: false,
  },
  {
    id: 'telemedicina',
    icon: Video,
    title: 'Telemedicina',
    description: 'Consultas por vídeo direto no sistema. Link enviado ao tutor automaticamente.',
    badge: null, badgeColor: '', col: '', row: '',
    accent: 'from-cyan-500/10 to-cyan-900/5',
    border: 'border-cyan-500/20',
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
    large: false,
  },
  {
    id: 'relatorios',
    icon: BarChart3,
    title: 'Relatórios Avançados',
    description: 'Dashboards com métricas de atendimento, receita e produtividade — exportáveis em PDF com 1 clique.',
    badge: null, badgeColor: '', col: 'md:col-span-2', row: '',
    accent: 'from-teal-500/10 to-teal-900/5',
    border: 'border-teal-500/20',
    iconBg: 'bg-teal-500/10',
    iconColor: 'text-teal-400',
    large: false,
  },
  {
    id: 'internacao',
    icon: BedDouble,
    title: 'Internação',
    description: 'Controle de leitos e prescrições hospitalares.',
    badge: null, badgeColor: '', col: '', row: '',
    accent: 'from-indigo-500/10 to-indigo-900/5',
    border: 'border-indigo-500/20',
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-400',
    large: false,
  },
  {
    id: 'lgpd',
    icon: Shield,
    title: 'LGPD & Segurança',
    description: 'Dados armazenados no Brasil. Backups automáticos, criptografia em repouso e 2FA.',
    badge: 'Brasil', badgeColor: 'bg-green-600',
    col: '', row: '',
    accent: 'from-green-500/10 to-green-900/5',
    border: 'border-green-500/20',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    large: false,
  },
  {
    id: 'lembretes',
    icon: Bell,
    title: 'Lembretes Automáticos',
    description: 'Notificações de vacinas e retornos por email.',
    badge: null, badgeColor: '', col: '', row: '',
    accent: 'from-orange-500/10 to-orange-900/5',
    border: 'border-orange-500/20',
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
    large: false,
  },
]

function BentoCard({ feature }: { feature: typeof FEATURES[0] }) {
  const { icon: Icon, title, description, badge, badgeColor, col, accent, border, iconBg, iconColor, large } = feature
  return (
    <div
      className={`group relative rounded-3xl p-6 border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-default overflow-hidden bg-gradient-to-br ${accent} ${border} ${col}`}
      style={{ borderWidth: 1 }}
    >
      {/* Glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.04), transparent 70%)' }} />

      {badge && (
        <span className={`absolute top-4 right-4 ${badgeColor} text-white text-[10px] font-bold px-2.5 py-1 rounded-full`}>
          {badge}
        </span>
      )}

      <div className={`${iconBg} rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 ${large ? 'w-14 h-14' : 'w-11 h-11'}`}>
        <Icon className={`${iconColor} ${large ? 'w-7 h-7' : 'w-5 h-5'}`} />
      </div>

      <h3 className={`font-bold text-white mb-2 ${large ? 'text-xl' : 'text-sm'}`}>{title}</h3>
      <p className={`text-white/50 leading-relaxed ${large ? 'text-sm' : 'text-xs'}`}>{description}</p>

      {large && (
        <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-purple-400">
          <Zap className="w-3.5 h-3.5" />
          Economize até 2h por dia
        </div>
      )}
    </div>
  )
}

export default function FeaturesSection() {
  return (
    <section id="funcionalidades" className="py-24" style={{ background: '#030d06' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-4" style={{ background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.25)', color: '#4ade80' }}>
            Tudo que sua clínica precisa
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Uma plataforma, todas as funcionalidades
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Substitua 5 sistemas diferentes por um único — feito para veterinários brasileiros.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f) => <BentoCard key={f.id} feature={f} />)}
        </div>
      </div>
    </section>
  )
}
