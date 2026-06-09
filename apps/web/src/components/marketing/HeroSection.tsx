'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, Star, Calendar, Users, DollarSign, Activity, FileText, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'

/* ── Dados por espécie ─────────────────────────────────────────────── */
const SPECIES = [
  {
    id: 'dog',
    emoji: '🐕',
    label: 'Cão',
    activeColor: '#16a34a',
    glow: 'rgba(22,163,74,0.14)',
    appointments: [
      { emoji: '🐕', pet: 'Thor',    breed: 'Golden Retriever', owner: 'Ana Lima',   time: '15:00' },
      { emoji: '🐕', pet: 'Mel',     breed: 'Labrador',         owner: 'João Costa', time: '15:30' },
    ],
  },
  {
    id: 'cat',
    emoji: '🐈',
    label: 'Gato',
    activeColor: '#0d9488',
    glow: 'rgba(13,148,136,0.14)',
    appointments: [
      { emoji: '🐈', pet: 'Mimi',    breed: 'Siamês',  owner: 'Carla Souza', time: '15:00' },
      { emoji: '🐈', pet: 'Bolinha', breed: 'Persa',   owner: 'Pedro Lima',  time: '15:30' },
    ],
  },
  {
    id: 'exotic',
    emoji: '🦜',
    label: 'Exótico',
    activeColor: '#d97706',
    glow: 'rgba(217,119,6,0.12)',
    appointments: [
      { emoji: '🦜', pet: 'Kiwi',  breed: 'Calopsita', owner: 'Maria Luz',  time: '15:00' },
      { emoji: '🦎', pet: 'Pixel', breed: 'Iguana',    owner: 'Carlos B.',  time: '15:30' },
    ],
  },
  {
    id: 'large',
    emoji: '🐴',
    label: 'Grande Porte',
    activeColor: '#7c3aed',
    glow: 'rgba(124,58,237,0.12)',
    appointments: [
      { emoji: '🐴', pet: 'Trovão',  breed: 'Equino',  owner: 'Haras Rio',   time: '15:00' },
      { emoji: '🐄', pet: 'Estrela', breed: 'Bovino',  owner: 'Fazenda Sol', time: '15:30' },
    ],
  },
] as const

type SpeciesItem = typeof SPECIES[number]

/* ── Aurora background ─────────────────────────────────────────────── */
function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute inset-0 bg-[#020a05]" />
      <div className="absolute w-[900px] h-[900px] rounded-full opacity-25 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #16a34a 0%, #15803d 40%, transparent 70%)', top: '-20%', left: '-10%', animation: 'aurora1 18s ease-in-out infinite' }} />
      <div className="absolute w-[700px] h-[700px] rounded-full opacity-20 blur-[100px]"
        style={{ background: 'radial-gradient(circle, #0d9488 0%, #0f766e 40%, transparent 70%)', top: '10%', right: '-5%', animation: 'aurora2 22s ease-in-out infinite' }} />
      <div className="absolute w-[500px] h-[500px] rounded-full opacity-15 blur-[80px]"
        style={{ background: 'radial-gradient(circle, #4ade80 0%, #22c55e 40%, transparent 70%)', bottom: '0%', left: '30%', animation: 'aurora3 15s ease-in-out infinite' }} />
      <div className="absolute w-[600px] h-[600px] rounded-full opacity-10 blur-[90px]"
        style={{ background: 'radial-gradient(circle, #7c3aed 0%, #6d28d9 40%, transparent 70%)', top: '40%', left: '20%', animation: 'aurora4 25s ease-in-out infinite' }} />
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      <style>{`
        @keyframes aurora1 { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(80px,-60px) scale(1.1)} 50%{transform:translate(-40px,80px) scale(0.95)} 75%{transform:translate(60px,40px) scale(1.05)} }
        @keyframes aurora2 { 0%,100%{transform:translate(0,0) scale(1)} 30%{transform:translate(-90px,50px) scale(1.08)} 60%{transform:translate(60px,-70px) scale(0.92)} }
        @keyframes aurora3 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(70px,-40px) scale(1.12)} 70%{transform:translate(-50px,60px) scale(0.9)} }
        @keyframes aurora4 { 0%,100%{transform:translate(0,0) scale(1)} 35%{transform:translate(-60px,-80px) scale(1.06)} 65%{transform:translate(80px,50px) scale(0.94)} }
      `}</style>
    </div>
  )
}

/* ── Dashboard mockup ─────────────────────────────────────────────── */
function DashboardMockup({ species }: { species: SpeciesItem }) {
  return (
    <div className="relative w-full max-w-xl mx-auto lg:mx-0">
      {/* Glow dinâmico por espécie */}
      <div
        className="absolute -inset-8 rounded-3xl blur-3xl pointer-events-none transition-all duration-1000"
        style={{ background: species.glow }}
      />

      {/* Browser shell */}
      <div
        className="relative rounded-2xl overflow-hidden border transition-shadow duration-700"
        style={{
          borderColor: 'rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Chrome bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)' }}>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 rounded-lg px-3 py-1 text-xs ml-2"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
            app.vetcare.com.br/dashboard
          </div>
        </div>

        {/* App body */}
        <div className="p-4" style={{ background: 'rgba(2,10,5,0.82)' }}>
          {/* Clinic header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium text-white/70">Clínica Pet Feliz</span>
            <span className="ml-auto text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Hoje, 14:32</span>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { icon: Calendar,   label: 'Consultas', value: '12',    color: 'text-blue-400',   bg: 'rgba(59,130,246,0.12)' },
              { icon: Users,      label: 'Pacientes', value: '248',   color: 'text-green-400',  bg: 'rgba(34,197,94,0.12)'  },
              { icon: DollarSign, label: 'Receita',   value: 'R$8.4k', color: 'text-purple-400', bg: 'rgba(168,85,247,0.12)' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5" style={{ background: s.bg }}>
                  <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                </div>
                <div className="text-sm font-bold text-white">{s.value}</div>
                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Mini chart — barra de destaque muda de cor com a espécie */}
          <div className="rounded-xl p-3 mb-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-white/70">Receita — 7 dias</span>
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            </div>
            <div className="flex items-end gap-1 h-12">
              {[35, 60, 45, 75, 50, 90, 68].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm transition-colors duration-700"
                  style={{ height: `${h}%`, background: i === 5 ? species.activeColor : 'rgba(34,197,94,0.22)' }} />
              ))}
            </div>
          </div>

          {/* Agenda — pets mudam com a espécie selecionada */}
          <div className="rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-xs font-semibold text-white/70 mb-2.5 flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-green-400" />
              Próximas consultas
            </div>
            {species.appointments.map((a, i) => (
              <div key={a.pet}
                className="flex items-center gap-2.5 py-1.5"
                style={{ borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                {/* Avatar com emoji do animal */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  {a.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-white/90">{a.pet}</span>
                  <span className="text-[10px] text-white/40"> · {a.breed}</span>
                  <div className="text-[10px] text-white/35">{a.owner}</div>
                </div>
                <div className="text-xs font-bold flex-shrink-0 transition-colors duration-700"
                  style={{ color: species.activeColor }}>
                  {a.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating badge — AI Scribe */}
      <div className="absolute -bottom-5 -left-5 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center">
          <Activity className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <div className="text-xs font-bold text-white">AI Scribe ativo</div>
          <div className="text-[10px] text-white/50">Transcrição automática</div>
        </div>
      </div>

      {/* Floating badge — NF-e */}
      <div className="absolute -top-5 -right-5 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <FileText className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <div className="text-xs font-bold text-white">NF-e emitida</div>
          <div className="text-[10px] text-white/50">Automaticamente</div>
        </div>
      </div>
    </div>
  )
}

/* ── Hero ─────────────────────────────────────────────────────────── */
export default function HeroSection() {
  const [activeIdx, setActiveIdx]     = useState(0)
  const [autoRotate, setAutoRotate]   = useState(true)

  const species = SPECIES[activeIdx]

  /* Auto-rotaciona espécies a cada 3.5s; para quando usuário clica */
  useEffect(() => {
    if (!autoRotate) return
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % SPECIES.length), 3500)
    return () => clearInterval(t)
  }, [autoRotate])

  function selectSpecies(idx: number) {
    setActiveIdx(idx)
    setAutoRotate(false)
  }

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      <AuroraBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* ── Lado esquerdo ──────────────────────────────────────── */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-semibold"
              style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)', color: '#4ade80' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Novo: AI Scribe — transcrição automática de consultas
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
              Gestão{' '}
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #0d9488 100%)' }}>
                veterinária
              </span>
              {' '}que seus concorrentes não têm
            </h1>

            {/* Sub */}
            <p className="text-lg text-white/60 mb-8 leading-relaxed max-w-lg">
              Prontuário digital, agenda online, AI Scribe, telemedicina e NF-e em um sistema feito para clínicas brasileiras.
            </p>

            {/* Checklist */}
            <ul className="space-y-3 mb-10">
              {[
                '14 dias grátis, sem cartão de crédito',
                'PIX, boleto e cartão — 100% brasileiro',
                'Dados protegidos pelo LGPD no Brasil',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-white/70">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link href="/register"
                className="group inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-2xl text-sm transition-all duration-200 shadow-lg hover:shadow-green-500/25 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #16a34a 0%, #0d9488 100%)', color: '#fff' }}>
                Começar grátis agora
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/pricing"
                className="inline-flex items-center justify-center gap-2 font-semibold px-8 py-4 rounded-2xl text-sm transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>
                Ver planos e preços
              </Link>
            </div>

            {/* Social proof — avatars com emojis de pets */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex -space-x-2">
                {['🐕', '🐈', '🦜', '🐴', '🐇'].map((pet, i) => (
                  <div key={i}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm border-2"
                    style={{ background: 'rgba(255,255,255,0.1)', borderColor: '#020a05' }}>
                    {pet}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5 text-yellow-400">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                </div>
                <p className="text-xs text-white/40">+200 clínicas utilizam o VetCare</p>
              </div>
            </div>

            {/* ── Seletor de espécies ─────────────────────────────── */}
            <div className="pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-3"
                style={{ color: 'rgba(255,255,255,0.3)' }}>
                Sua clínica atende
              </p>
              <div className="flex flex-wrap gap-2">
                {SPECIES.map((s, i) => {
                  const isActive = activeIdx === i
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectSpecies(i)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                      style={{
                        background: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                        border: isActive ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.07)',
                        color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                        transform: isActive ? 'scale(1.06)' : 'scale(1)',
                      }}
                    >
                      <span className={isActive ? 'animate-bounce-gentle' : ''}>{s.emoji}</span>
                      <span>{s.label}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full"
                          style={{ background: species.activeColor }} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Lado direito: mockup ────────────────────────────────── */}
          <div className="flex justify-center lg:justify-end">
            <DashboardMockup species={species} />
          </div>

        </div>
      </div>

      {/* Fade to white */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #fff)' }} />
    </section>
  )
}
