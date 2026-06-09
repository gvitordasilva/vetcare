'use client'

import { useState } from 'react'
import { Play, X } from 'lucide-react'

// ✏️ Substitua pelo ID do seu vídeo no YouTube quando estiver pronto
// Ex: para https://www.youtube.com/watch?v=dQw4w9WgXcQ → "dQw4w9WgXcQ"
const DEMO_VIDEO_ID = ''

export default function VideoSection() {
  const [playing, setPlaying] = useState(false)

  return (
    <section id="video" className="py-24 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-green-600 text-sm font-semibold bg-green-50 px-4 py-2 rounded-full mb-4">
            Demonstração
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Veja o VetCare em ação
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Em menos de 3 minutos você entende como o VetCare transforma a rotina da sua clínica.
          </p>
        </div>

        {/* Video container */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-200 bg-gray-900 aspect-video">
          {DEMO_VIDEO_ID && playing ? (
            <>
              <iframe
                src={`https://www.youtube.com/embed/${DEMO_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
                title="VetCare — Demonstração"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
              <button
                onClick={() => setPlaying(false)}
                className="absolute top-4 right-4 z-10 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition"
                aria-label="Fechar vídeo"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {/* Thumbnail / placeholder */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-emerald-950 flex items-center justify-center">
                {/* Grid pattern */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                  }}
                />

                {/* Dashboard preview silhouette */}
                <div className="absolute inset-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
                  <div className="bg-white/10 h-8 flex items-center px-4 gap-2">
                    <div className="w-2 h-2 rounded-full bg-white/40" />
                    <div className="w-2 h-2 rounded-full bg-white/40" />
                    <div className="w-2 h-2 rounded-full bg-white/40" />
                  </div>
                  <div className="p-4 grid grid-cols-4 gap-3">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className={`bg-white/10 rounded-lg ${i < 4 ? 'h-16' : 'h-24'}`} />
                    ))}
                  </div>
                </div>

                {/* Play button */}
                <button
                  onClick={() => DEMO_VIDEO_ID ? setPlaying(true) : undefined}
                  className={`relative z-10 group flex items-center gap-4 ${!DEMO_VIDEO_ID ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
                  aria-label="Reproduzir demonstração"
                >
                  <div className={`w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl ${DEMO_VIDEO_ID ? 'group-hover:scale-110' : ''} transition-transform duration-200`}>
                    <Play className="w-8 h-8 text-green-600 fill-green-600 ml-1" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-bold text-lg leading-tight">
                      {DEMO_VIDEO_ID ? 'Assistir demonstração' : 'Vídeo em breve'}
                    </div>
                    <div className="text-green-300 text-sm">
                      {DEMO_VIDEO_ID ? 'Duração: ~3 min' : 'Em produção'}
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Caption */}
        <p className="text-center text-sm text-gray-400 mt-4">
          {DEMO_VIDEO_ID
            ? 'Veja como é simples cadastrar pacientes, agendar consultas e emitir NF-e.'
            : '🎬 Vídeo demonstrativo sendo preparado — volte em breve!'}
        </p>
      </div>
    </section>
  )
}
