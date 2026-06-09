import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Dra. Ana Paula Souza',
    role: 'Médica Veterinária',
    clinic: 'Clínica Vida Animal — SP',
    initial: 'A',
    gradient: 'from-green-400 to-emerald-600',
    specialty: 'Cães & Gatos',
    specialtyEmoji: '🐕🐈',
    text: 'O AI Scribe mudou completamente minha rotina. Antes passava 40 minutos preenchendo prontuários — hoje termino a consulta e está tudo lá. Meus Golden Retrievers e Siameses agradecem!',
    stars: 5,
    featured: { emoji: '🐕', pet: 'Thor', result: '2h economizadas por dia' },
  },
  {
    name: 'Dr. Marco Ribeiro',
    role: 'Proprietário & Veterinário',
    clinic: 'PetCenter Saúde — RJ',
    initial: 'M',
    gradient: 'from-blue-400 to-blue-600',
    specialty: 'Clínica Geral',
    specialtyEmoji: '🐕🐈🦜',
    text: 'Migrei de uma planilha Excel bagunçada pro VetCare num fim de semana. Hoje gerencio consultas de cães, gatos e exóticos num sistema só, com financeiro em tempo real.',
    stars: 5,
    featured: { emoji: '🦜', pet: 'Kiwi (Calopsita)', result: 'Exóticos e cães no mesmo sistema' },
  },
  {
    name: 'Dra. Camila Torres',
    role: 'Diretora Clínica',
    clinic: 'Rede VetBem — MG (3 unidades)',
    initial: 'C',
    gradient: 'from-purple-400 to-purple-600',
    specialty: 'Grandes animais',
    specialtyEmoji: '🐴🐄',
    text: 'Gerencio 3 unidades com cavalos, bovinos e pequenos animais pelo VetCare. Os relatórios consolidados e o controle por espécie são exatamente o que uma clínica de grande porte precisa.',
    stars: 5,
    featured: { emoji: '🐴', pet: 'Trovão (Equino)', result: '3 unidades, 1 sistema' },
  },
]

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-green-600 text-sm font-semibold bg-white px-4 py-2 rounded-full mb-4 shadow-sm">
            🐾 Depoimentos reais
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Veterinários que transformaram sua clínica
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            De clínicas de cão e gato a hospitais veterinários de grande porte — o VetCare serve a todas.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-3xl p-8 shadow-sm border border-green-100 hover:shadow-lg hover:border-green-200 hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              {/* Quote icon */}
              <Quote className="w-8 h-8 text-green-200 mb-4 flex-shrink-0" />

              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-4">
                {[...Array(t.stars)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>

              {/* Specialty badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">{t.specialtyEmoji}</span>
                <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                  {t.specialty}
                </span>
              </div>

              {/* Depoimento */}
              <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-5 italic">
                "{t.text}"
              </p>

              {/* Case destaque */}
              <div className="flex items-center gap-3 p-3 rounded-2xl mb-5"
                style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.12)' }}>
                <span className="text-2xl">{t.featured.emoji}</span>
                <div>
                  <p className="text-xs font-bold text-gray-800">{t.featured.result}</p>
                  <p className="text-[11px] text-gray-400">paciente: {t.featured.pet}</p>
                </div>
              </div>

              {/* Autor */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                {/* Avatar com gradiente */}
                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm`}>
                  {t.initial}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role} · {t.clinic}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div className="mt-16 bg-white rounded-3xl border border-green-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-green-50">
            {[
              { value: '200+', label: 'Clínicas ativas',          emoji: '🏥' },
              { value: '50k+', label: 'Pacientes gerenciados',     emoji: '🐾' },
              { value: '98%',  label: 'Taxa de satisfação',        emoji: '⭐' },
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
              { emoji: '🐕', label: 'Cão'          },
              { emoji: '🐈', label: 'Gato'         },
              { emoji: '🦜', label: 'Aves'         },
              { emoji: '🐇', label: 'Coelho'       },
              { emoji: '🦎', label: 'Répteis'      },
              { emoji: '🐹', label: 'Roedores'     },
              { emoji: '🐴', label: 'Equinos'      },
              { emoji: '🐄', label: 'Bovinos'      },
              { emoji: '🐟', label: 'Aquáticos'    },
              { emoji: '🐾', label: 'E mais...'    },
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
