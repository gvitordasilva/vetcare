'use client'

import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  LayoutDashboard, Calendar, ClipboardList, DollarSign,
  TrendingUp, Mic2, CheckCircle2, Clock,
} from 'lucide-react'

/* ── View Transition helper (progressive enhancement) ─────────────── */
function withViewTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  if (doc.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    doc.startViewTransition(() => flushSync(update))
  } else {
    update()
  }
}

/* ── Counter animado (rAF + easeOutCubic) ──────────────────────────── */
function Counter({ value, prefix = '', suffix = '', decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const dur = 750
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(value * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return (
    <span className="tabular-nums">
      {prefix}{display.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  )
}

/* ── Dados das tabs ────────────────────────────────────────────────── */
const TABS = [
  { id: 'dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { id: 'agenda',     label: 'Agenda',      icon: Calendar },
  { id: 'prontuario', label: 'Prontuário',  icon: ClipboardList },
  { id: 'financeiro', label: 'Financeiro',  icon: DollarSign },
] as const

type TabId = typeof TABS[number]['id']

/* Card interno com border glow sutil */
const innerCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 0 24px rgba(22,163,74,0.07) inset, 0 0 12px rgba(22,163,74,0.05)',
}

function DashboardTab() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'Consultas hoje',    val: 12,   prefix: '',    color: 'text-blue-400' },
          { label: 'Pacientes ativos',  val: 248,  prefix: '',    color: 'text-green-400' },
          { label: 'Receita do mês',    val: 8420, prefix: 'R$ ', color: 'text-purple-400' },
          { label: 'Vacinas pendentes', val: 7,    prefix: '',    color: 'text-orange-400' },
        ].map((k) => (
          <div key={k.label} className="rounded-xl p-3.5" style={innerCard}>
            <div className={`text-xl font-black ${k.color}`}>
              <Counter value={k.val} prefix={k.prefix} />
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-4" style={innerCard}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-semibold text-white/70">Receita — últimos 7 dias</span>
          <TrendingUp className="w-3.5 h-3.5 text-green-400" />
        </div>
        <div className="flex items-end gap-1.5 h-20">
          {[42, 65, 48, 78, 56, 92, 70].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-md preview-bar"
              style={{
                height: `${h}%`,
                background: i === 5 ? '#16a34a' : 'rgba(34,197,94,0.25)',
                animationDelay: `${i * 70}ms`,
              }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function AgendaTab() {
  const rows = [
    { time: '14:00', pet: '🐕 Thor',    detail: 'Consulta de rotina · Dr. Marcos',  status: 'Confirmado',  chip: 'bg-green-500/15 text-green-400' },
    { time: '14:30', pet: '🐈 Mimi',    detail: 'Vacinação V4 · Dra. Paula',        status: 'Em espera',   chip: 'bg-amber-500/15 text-amber-400' },
    { time: '15:00', pet: '🐇 Pipoca',  detail: 'Retorno cirúrgico · Dr. Marcos',   status: 'Confirmado',  chip: 'bg-green-500/15 text-green-400' },
    { time: '15:30', pet: '🦜 Kiwi',    detail: 'Exame de bico · Dra. Paula',       status: 'Telemedicina', chip: 'bg-cyan-500/15 text-cyan-400' },
  ]
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.time} className="flex items-center gap-3 rounded-xl px-4 py-3" style={innerCard}>
          <div className="flex items-center gap-1.5 text-xs font-bold text-white/80 w-14 flex-shrink-0">
            <Clock className="w-3 h-3 text-green-400" /> {r.time}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white/90 truncate">{r.pet}</div>
            <div className="text-[11px] text-white/40 truncate">{r.detail}</div>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${r.chip}`}>
            {r.status}
          </span>
        </div>
      ))}
    </div>
  )
}

function ProntuarioTab() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={innerCard}>
        <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center text-xl">🐕</div>
        <div className="flex-1">
          <div className="text-sm font-bold text-white">Thor · Golden Retriever</div>
          <div className="text-[11px] text-white/40">5 anos · 32,4 kg · Tutor: Ana Lima</div>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-full bg-purple-500/15 text-purple-300">
          <Mic2 className="w-3 h-3" /> AI Scribe
        </span>
      </div>

      {[
        { label: 'Anamnese',    text: 'Tutor relata apatia e redução de apetite há 2 dias. Sem vômito ou diarreia.' },
        { label: 'Diagnóstico', text: 'Gastrite leve por indiscrição alimentar.' },
        { label: 'Prescrição',  text: 'Omeprazol 20mg — 1x ao dia por 7 dias · Dieta leve' },
      ].map((f) => (
        <div key={f.label} className="rounded-xl px-4 py-3" style={innerCard}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-green-400 mb-1">{f.label}</div>
          <div className="text-xs text-white/65 leading-relaxed">{f.text}</div>
        </div>
      ))}

      <div className="flex items-center gap-2 text-[11px] text-white/35">
        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
        Preenchido automaticamente pela IA em 4,2s — revisado pelo veterinário
      </div>
    </div>
  )
}

function FinanceiroTab() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: 'Entradas (mês)', val: 12480, color: 'text-green-400' },
          { label: 'A receber',      val: 3240,  color: 'text-amber-400' },
          { label: 'Ticket médio',   val: 186,   color: 'text-blue-400' },
        ].map((k) => (
          <div key={k.label} className="rounded-xl p-3.5" style={innerCard}>
            <div className={`text-lg font-black ${k.color}`}>
              <Counter value={k.val} prefix="R$ " />
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {[
        { desc: 'Consulta + Vacina V10 · Thor',      val: '+ R$ 240,00', method: 'PIX',    color: 'text-green-400' },
        { desc: 'Banho & Tosa · Mel',                 val: '+ R$ 90,00',  method: 'Cartão', color: 'text-green-400' },
        { desc: 'NF-e #1042 emitida automaticamente', val: '✓',           method: 'Asaas',  color: 'text-white/50' },
      ].map((t) => (
        <div key={t.desc} className="flex items-center justify-between rounded-xl px-4 py-3" style={innerCard}>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white/85 truncate">{t.desc}</div>
            <div className="text-[10px] text-white/35">{t.method}</div>
          </div>
          <span className={`text-xs font-bold flex-shrink-0 ml-3 ${t.color}`}>{t.val}</span>
        </div>
      ))}
    </div>
  )
}

const TAB_CONTENT: Record<TabId, () => JSX.Element> = {
  dashboard:  DashboardTab,
  agenda:     AgendaTab,
  prontuario: ProntuarioTab,
  financeiro: FinanceiroTab,
}

/* ── Seção ─────────────────────────────────────────────────────────── */
export default function DashboardPreviewSection() {
  const [tab, setTab] = useState<TabId>('dashboard')
  const sectionRef = useRef<HTMLElement>(null)
  const [seen, setSeen] = useState(false)

  /* Counters só disparam quando a seção aparece (key remount) */
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } },
      { threshold: 0.2 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  function switchTab(id: TabId) {
    if (id === tab) return
    withViewTransition(() => setTab(id))
  }

  const Content = TAB_CONTENT[tab]

  return (
    <section id="video" ref={sectionRef} className="py-24 bg-gray-50">
      <style>{`
        @keyframes previewBarGrow {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }
        .preview-bar {
          transform-origin: bottom;
          animation: previewBarGrow 0.6s cubic-bezier(0.22,1,0.36,1) backwards;
        }
        @keyframes previewTabIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .preview-tab-content { animation: previewTabIn 0.35s cubic-bezier(0.22,1,0.36,1); }
        @keyframes previewHue {
          0%, 100% { filter: hue-rotate(0deg); }
          50%       { filter: hue-rotate(28deg); }
        }
        .preview-glow-border { animation: previewHue 9s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .preview-bar, .preview-tab-content { animation: none; }
          .preview-glow-border { animation: none; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-green-600 text-sm font-semibold bg-green-50 px-4 py-2 rounded-full mb-4 border border-green-100">
            Veja por dentro
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
            O sistema que sua equipe vai amar usar
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Navegue pelas telas reais do VetCare — sem cadastro, sem instalação.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-gray-900 text-white shadow-lg scale-[1.03]'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-800'
                }`}
              >
                <t.icon className={`w-4 h-4 ${active ? 'text-green-400' : ''}`} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Mockup com border glow */}
        <div className="preview-glow-border rounded-[26px] p-[1.5px]"
          style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.55), rgba(13,148,136,0.35), rgba(124,58,237,0.3), rgba(22,163,74,0.55))' }}>
          <div className="rounded-3xl overflow-hidden" style={{ background: '#040f08' }}>
            {/* Chrome bar */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.35)' }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 max-w-sm mx-auto rounded-lg px-3 py-1 text-xs text-center"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                app.vetcare.com.br/{tab}
              </div>
            </div>

            {/* Conteúdo da tab — key remonta counters/animacões a cada troca */}
            <div className="p-5 sm:p-6 min-h-[340px]">
              {seen && (
                <div key={tab} className="preview-tab-content">
                  <Content />
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-5">
          Dados ilustrativos. Crie sua conta e veja com os dados da sua clínica em 2 minutos.
        </p>
      </div>
    </section>
  )
}
