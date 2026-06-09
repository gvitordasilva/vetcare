import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Dra. Ana Paula Souza',
    role: 'Médica Veterinária',
    clinic: 'Clínica Vida Animal — SP',
    initial: 'A',
    color: 'from-green-400 to-emerald-600',
    text: 'O AI Scribe mudou completamente minha rotina. Antes eu passava 40 minutos preenchendo prontuários — hoje termino a consulta e está tudo lá. É simplesmente incrível.',
    stars: 5,
  },
  {
    name: 'Dr. Marco Ribeiro',
    role: 'Proprietário',
    clinic: 'PetCenter Saúde — RJ',
    initial: 'M',
    color: 'from-blue-400 to-blue-600',
    text: 'Migrei de uma planilha Excel bagunçada para o VetCare em um fim de semana. O suporte me ajudou a importar todos os dados. Hoje consigo ver o financeiro em tempo real.',
    stars: 5,
  },
  {
    name: 'Dra. Camila Torres',
    role: 'Sócia-diretora',
    clinic: 'Rede VetBem — MG (3 unidades)',
    initial: 'C',
    color: 'from-purple-400 to-purple-600',
    text: 'Gerencio 3 unidades e 18 veterinários pelo VetCare. Os relatórios consolidados e o controle financeiro por unidade são exatamente o que eu precisava. Recomendo muito.',
    stars: 5,
  },
]

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-green-600 text-sm font-semibold bg-white px-4 py-2 rounded-full mb-4 shadow-sm">
            Depoimentos reais
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Veterinários que transformaram sua clínica
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Mais de 200 clínicas em todo o Brasil confiam no VetCare para gerenciar seus negócios.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-3xl p-8 shadow-sm border border-green-100 hover:shadow-md hover:border-green-200 transition-all duration-200 flex flex-col"
            >
              {/* Quote icon */}
              <Quote className="w-8 h-8 text-green-200 mb-4" />

              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-4">
                {[...Array(t.stars)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>

              {/* Text */}
              <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-6 italic">
                "{t.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
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
        <div className="mt-16 bg-white rounded-3xl border border-green-100 shadow-sm p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '200+', label: 'Clínicas ativas' },
              { value: '50k+', label: 'Pacientes gerenciados' },
              { value: '98%', label: 'Taxa de satisfação' },
              { value: '< 2min', label: 'Tempo médio de suporte' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-black text-green-600 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
