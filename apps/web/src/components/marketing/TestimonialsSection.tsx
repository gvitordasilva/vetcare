'use client'

import { Star, PawPrint } from 'lucide-react'

/* ── Depoimentos (6 para o loop ficar variado) ─────────────────────── */
const TESTIMONIALS = [
  {
    name: 'Dra. Ana Paula Souza',
    role: 'Médica Veterinária',
    clinic: 'Vida Animal',
    city: 'São Paulo — SP',
    monogram: 'VA',
    gradient: 'from-green-400 to-emerald-600',
    specialtyEmoji: '🐕🐈',
    text: 'O AI Scribe mudou minha rotina. Antes passava 40 minutos preenchendo prontuários — hoje termino a consulta e está tudo lá.',
  },
  {
    name: 'Dr. Marco Ribeiro',
    role: 'Proprietário',
    clinic: 'PetCenter Saúde',
    city: 'Rio de Janeiro — RJ',
    monogram: 'PC',
    gradient: 'from-blue-400 to-blue-600',
    specialtyEmoji: '🐕🦜',
    text: 'Migrei de uma planilha Excel bagunçada pro VetCare num fim de semana. Hoje vejo o financeiro em tempo real.',
  },
  {
    name: 'Dra. Camila Torres',
    role: 'Diretora Clínica',
    clinic: 'Rede VetBem',
    city: 'Belo Horizonte — MG',
    monogram: 'VB',
    gradient: 'from-purple-400 to-purple-600',
    specialtyEmoji: '🐴🐄',
    text: 'Gerencio 3 unidades com equinos, bovinos e pequenos animais. Os relatórios consolidados são exatamente o que eu precisava.',
  },
  {
    name: 'Dr. Felipe Andrade',
    role: 'Especialista em Exóticos',
    clinic: 'Exotic Vet',
    city: 'Curitiba — PR',
    monogram: 'EV',
    gradient: 'from-amber-400 to-orange-600',
    specialtyEmoji: '🦜🦎',
    text: 'Atendo aves, répteis e roedores. O prontuário flexível do VetCare é o único que se adapta a cada espécie sem gambiarras.',
  },
  {
    name: 'Dra. Juliana Mota',
    role: 'Sócia-proprietária',
    clinic: 'Banho & Cia Pet',
    city: 'Porto Alegre — RS',
    monogram: 'BC',
    gradient: 'from-pink-400 to-rose-600',
    specialtyEmoji: '🐩✂️',
    text: 'O módulo de Banho & Tosa com pacotes e comissões organizou nossa operação inteira. Os tutores recebem tudo por email.',
  },
  {
    name: 'Dr. Rodrigo Campos',
    role: 'Médico Veterinário',
    clinic: 'VetSertão',
    city: 'Petrolina — PE',
    monogram: 'VS',
    gradient: 'from-cyan-400 to-teal-600',
    specialtyEmoji: '🐕📹',
    text: 'A telemedicina me permite acompanhar pacientes a 200km de distância. O tutor recebe o link e pronto — funciona.',
  },
]

/* ── Card (glassmorphism sobre fundo claro) ────────────────────────── */
function TestimonialCard({ t }: { t: typeof TESTIMONIALS[0] }) {
  return (
    <div
      className="w-[340px] sm:w-[380px] flex-shrink-0 rounded-3xl p-7 border border-green-100/80 flex flex-col"
      style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 4px 24px rgba(22,163,74,0.06)',
      }}
    >
      {/* Logo fictício da clínica */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center shadow-sm`}>
            <span className="text-white font-black text-[11px] tracking-tight">{t.monogram}</span>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <PawPrint className="w-3 h-3 text-gray-300" />
              <span className="text-sm font-bold text-gray-800 tracking-tight">{t.clinic}</span>
            </div>
            <span className="text-[10px] text-gray-400">{t.city}</span>
          </div>
        </div>
        <span className="text-base">{t.specialtyEmoji}</span>
      </div>

      {/* Stars */}
      <div className="flex items-center gap-0.5 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-current" />
        ))}
      </div>

      {/* Texto */}
      <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-5 italic">
        "{t.text}"
      </p>

      {/* Autor */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
          {t.name.split(' ')[1]?.[0] ?? t.name[0]}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{t.name}</p>
          <p className="text-xs text-gray-500">{t.role}</p>
        </div>
      </div>
    </div>
  )
}

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-green-50 overflow-hidden">
      <style>{`
        @keyframes testimonialMarquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .testimonial-track {
          animation: testimonialMarquee 48s linear infinite;
          will-change: transform;
        }
        .testimonial-marquee:hover .testimonial-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .testimonial-track { animation: none; }
          .testimonial-marquee { overflow-x: auto; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-green-600 text-sm font-semibold bg-white px-4 py-2 rounded-full mb-4 shadow-sm">
            🐾 Depoimentos reais
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Veterinários que transformaram sua clínica
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            De clínicas de cão e gato a hospitais de grande porte — passe o mouse para pausar e ler.
          </p>
        </div>
      </div>

      {/* ── Marquee full-bleed ─────────────────────────────────────── */}
      <div className="testimonial-marquee relative overflow-hidden">
        {/* Máscaras de fade nas bordas */}
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #f0fdf4, transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, #f0fdf4, transparent)' }} />

        {/* Track duplicada para loop contínuo (translateX -50%) */}
        <div className="testimonial-track flex gap-5 w-max py-2 px-4">
          {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <TestimonialCard key={`${t.clinic}-${i}`} t={t} />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats bar */}
        <div className="mt-14 bg-white rounded-3xl border border-green-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-green-50">
            {[
              { value: '200+',   label: 'Clínicas ativas',         emoji: '🏥' },
              { value: '50k+',   label: 'Pacientes gerenciados',   emoji: '🐾' },
              { value: '98%',    label: 'Taxa de satisfação',      emoji: '⭐' },
              { value: '< 2min', label: 'Tempo médio de suporte',  emoji: '💬' },
            ].map((stat) => (
              <div key={stat.label} className="text-center py-8 px-4">
                <div className="text-2xl mb-1">{stat.emoji}</div>
                <div className="text-3xl font-black text-green-600 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Species showcase */}
        <div className="mt-10 text-center">
          <p className="text-sm text-gray-400 mb-4">Atende todas as espécies</p>
          <div className="flex items-center justify-center flex-wrap gap-3">
            {[
              { emoji: '🐕', label: 'Cão' },
              { emoji: '🐈', label: 'Gato' },
              { emoji: '🦜', label: 'Aves' },
              { emoji: '🐇', label: 'Coelho' },
              { emoji: '🦎', label: 'Répteis' },
              { emoji: '🐹', label: 'Roedores' },
              { emoji: '🐴', label: 'Equinos' },
              { emoji: '🐄', label: 'Bovinos' },
              { emoji: '🐟', label: 'Aquáticos' },
              { emoji: '🐾', label: 'E mais...' },
            ].map((s) => (
              <div key={s.label}
                className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-green-100 text-sm text-gray-600 shadow-sm">
                <span>{s.emoji}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
