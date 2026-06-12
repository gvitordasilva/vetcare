'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ClipboardList, Calendar, DollarSign, Mic2, Video, BedDouble,
  Scissors, FileText, BarChart3, Bell, Zap, Shield,
} from 'lucide-react'
import useTilt from './useTilt'

/* ── Bento features ──────────────────────────────────────────────── */
const FEATURES = [
  {
    id: 'ai-scribe',
    icon: Mic2,
    title: 'AI Scribe',
    description: 'A IA transcreve a consulta em tempo real e preenche o prontuário automaticamente. Foque no animal, não no teclado.',
    badge: 'IA Nativa',
    badgeColor: 'bg-purple-500',
    col: 'md:col-span-2',
    accent: 'from-purple-500/10 to-purple-900/5',
    border: 'border-purple-500/20',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    large: true,
    petDecor: '🐾',
  },
  {
    id: 'prontuario',
    icon: ClipboardList,
    title: 'Prontuário Eletrônico',
    description: 'Histórico completo, anamnese, exames e prescrições.',
    badge: null, badgeColor: '', col: '',
    accent: 'from-blue-500/10 to-blue-900/5',
    border: 'border-blue-500/20',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    large: false,
    petDecor: '🐕',
  },
  {
    id: 'agenda',
    icon: Calendar,
    title: 'Agenda Inteligente',
    description: 'Agendamento online com confirmação automática.',
    badge: null, badgeColor: '', col: '',
    accent: 'from-green-500/10 to-green-900/5',
    border: 'border-green-500/20',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    large: false,
    petDecor: '🐈',
  },
  {
    id: 'financeiro',
    icon: DollarSign,
    title: 'Financeiro Completo',
    description: 'Fluxo de caixa, comissões e relatórios de lucro. Integrado com Asaas para cobranças automáticas.',
    badge: null, badgeColor: '', col: 'md:col-span-2',
    accent: 'from-amber-500/10 to-amber-900/5',
    border: 'border-amber-500/20',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    large: false,
    petDecor: '🦴',
  },
  {
    id: 'nfe',
    icon: FileText,
    title: 'NF-e / NFS-e',
    description: 'Emissão automática ao concluir atendimento.',
    badge: null, badgeColor: '', col: '',
    accent: 'from-red-500/10 to-red-900/5',
    border: 'border-red-500/20',
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    large: false,
    petDecor: '🐇',
  },
  {
    id: 'telemedicina',
    icon: Video,
    title: 'Telemedicina',
    description: 'Consultas por vídeo direto no sistema. Link enviado ao tutor automaticamente.',
    badge: null, badgeColor: '', col: '',
    accent: 'from-cyan-500/10 to-cyan-900/5',
    border: 'border-cyan-500/20',
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
    large: false,
    petDecor: '🦜',
  },
  {
    id: 'relatorios',
    icon: BarChart3,
    title: 'Relatórios Avançados',
    description: 'Dashboards com métricas de atendimento, receita e produtividade — exportáveis em PDF com 1 clique.',
    badge: null, badgeColor: '', col: 'md:col-span-2',
    accent: 'from-teal-500/10 to-teal-900/5',
    border: 'border-teal-500/20',
    iconBg: 'bg-teal-500/10',
    iconColor: 'text-teal-400',
    large: false,
    petDecor: '🐠',
  },
  {
    id: 'internacao',
    icon: BedDouble,
    title: 'Internação',
    description: 'Controle de leitos e prescrições hospitalares.',
    badge: null, badgeColor: '', col: '',
    accent: 'from-indigo-500/10 to-indigo-900/5',
    border: 'border-indigo-500/20',
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-400',
    large: false,
    petDecor: '🐴',
  },
  {
    id: 'lgpd',
    icon: Shield,
    title: 'LGPD & Segurança',
    description: 'Dados armazenados no Brasil. Backups automáticos, criptografia em repouso e 2FA.',
    badge: 'Brasil', badgeColor: 'bg-green-600',
    col: '',
    accent: 'from-green-500/10 to-green-900/5',
    border: 'border-green-500/20',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    large: false,
    petDecor: '🛡️',
  },
  {
    id: 'lembretes',
    icon: Bell,
    title: 'Lembretes Automáticos',
    description: 'Notificações de vacinas e retornos por email.',
    badge: null, badgeColor: '', col: '',
    accent: 'from-orange-500/10 to-orange-900/5',
    border: 'border-orange-500/20',
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
    large: false,
    petDecor: '🐶',
  },
]

/* ── Bento card: reveal (camada externa) + tilt (camada interna) ──── */
// Duas camadas porque ambos os efeitos disputariam o mesmo `transform`:
// a externa anima a entrada via transition (opacity/translateY) e a interna
// recebe o tilt por rAF sem transition de transform.
function BentoCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const revealRef = useRef<HTMLDivElement>(null)
  const tiltRef = useTilt<HTMLDivElement>({ maxRotX: 4, maxRotY: 5, scale: 1.015, lerp: 0.12 })
  const [visible, setVisible] = useState(false)

  const { icon: Icon, title, description, badge, badgeColor, col, accent, border, iconBg, iconColor, large, petDecor } = feature

  useEffect(() => {
    const el = revealRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -48px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={revealRef}
      className={`transition-all duration-700 ${col}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transitionDelay: `${index * 55}ms`,
      }}
    >
      <div
        ref={tiltRef}
        className={[
          'group relative h-full rounded-3xl p-6 border overflow-hidden',
          'bg-gradient-to-br cursor-default',
          'transition-shadow duration-300 hover:shadow-xl hover:shadow-black/30',
          accent, border,
        ].join(' ')}
        style={{ borderWidth: 1, willChange: 'transform' }}
      >
        {/* Glow sutil no hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.04), transparent 70%)' }} />

        {/* Pet emoji decorativo */}
        <div className="absolute top-4 right-4 text-2xl opacity-20 group-hover:opacity-50 group-hover:scale-125 transition-all duration-300 select-none"
          aria-hidden>
          {petDecor}
        </div>

        {badge && (
          <span className={`absolute top-4 right-14 ${badgeColor} text-white text-[10px] font-bold px-2.5 py-1 rounded-full`}>
            {badge}
          </span>
        )}

        {/* Ícone — wiggle no hover do card */}
        <div className={`${iconBg} bento-icon rounded-2xl flex items-center justify-center mb-4 ${large ? 'w-14 h-14' : 'w-11 h-11'}`}>
          <Icon className={`${iconColor} ${large ? 'w-7 h-7' : 'w-5 h-5'}`} />
        </div>

        <h3 className={`font-bold text-white mb-2 ${large ? 'text-xl' : 'text-sm'}`}>{title}</h3>
        <p className={`text-white/50 leading-relaxed ${large ? 'text-sm' : 'text-xs'}`}>{description}</p>

        {large && (
          <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-purple-400">
            <Zap className="w-3.5 h-3.5" />
            Economize até 2h por dia no prontuário
          </div>
        )}
      </div>
    </div>
  )
}

export default function FeaturesSection() {
  return (
    <section id="funcionalidades" className="py-24" style={{ background: '#030d06' }}>
      <style>{`
        @keyframes bentoIconWiggle {
          0%   { transform: rotate(0deg) scale(1); }
          30%  { transform: rotate(-8deg) scale(1.12); }
          60%  { transform: rotate(6deg) scale(1.08); }
          100% { transform: rotate(0deg) scale(1.1); }
        }
        .group:hover .bento-icon { animation: bentoIconWiggle 0.45s ease-out forwards; }
        .group:not(:hover) .bento-icon { transform: scale(1); transition: transform 0.25s ease; }
        @media (prefers-reduced-motion: reduce) {
          .group:hover .bento-icon { animation: none; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-4"
            style={{ background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.25)', color: '#4ade80' }}>
            🐾 Tudo que sua clínica precisa
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">
            Uma plataforma, todas as funcionalidades
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Substitua 5 sistemas diferentes por um único — feito para veterinários brasileiros.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => <BentoCard key={f.id} feature={f} index={i} />)}
        </div>
      </div>
    </section>
  )
}
