'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PawPrint, Syringe, ClipboardList, Weight, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { portalPetsApi } from '@/lib/portal-api'

const SPECIES_EMOJI: Record<string, string> = {
  DOG: '🐕', CAT: '🐈', BIRD: '🐦', RABBIT: '🐇',
  HAMSTER: '🐹', REPTILE: '🦎', OTHER: '🐾',
}
const SPECIES_LABELS: Record<string, string> = {
  DOG: 'Cão', CAT: 'Gato', BIRD: 'Ave', RABBIT: 'Coelho',
  HAMSTER: 'Hamster', REPTILE: 'Réptil', OTHER: 'Outro',
}
const GENDER_LABELS: Record<string, string> = { MALE: 'Macho', FEMALE: 'Fêmea' }

function PetCard({ pet }: { pet: any }) {
  const [expanded, setExpanded] = useState(false)

  const age = pet.birthDate
    ? Math.floor((Date.now() - new Date(pet.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  const nextVaccine = pet.vaccines?.find((v: any) => v.nextDoseAt && new Date(v.nextDoseAt) > new Date())
  const upcomingAppt = pet.appointments?.[0]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header do card */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
            {pet.photoUrl
              ? <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover rounded-2xl" />
              : SPECIES_EMOJI[pet.species] ?? '🐾'
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{pet.name}</h2>
              {pet.castrated && (
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Castrado</span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {SPECIES_LABELS[pet.species] ?? pet.species} • {pet.breed}
              {age != null && ` • ${age} ano${age !== 1 ? 's' : ''}`}
              {pet.gender && ` • ${GENDER_LABELS[pet.gender]}`}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {pet.weight && (
                <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">
                  ⚖️ {pet.weight} kg
                </span>
              )}
              {nextVaccine && (
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">
                  💉 Próxima vacina: {format(new Date(nextVaccine.nextDoseAt), 'dd/MM/yy')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Alergias — visível sempre */}
        {pet.allergies && (
          <div className="flex items-start gap-2 mt-3 bg-red-50 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              <strong>Alergias:</strong> {pet.allergies}
            </p>
          </div>
        )}

        {/* Próxima consulta */}
        {upcomingAppt && (
          <div className="mt-3 bg-primary/5 rounded-xl p-3">
            <p className="text-xs text-primary font-semibold">Próxima consulta agendada</p>
            <p className="text-sm text-gray-700 mt-0.5">
              {format(new Date(upcomingAppt.scheduledAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              {' '}— Dr(a). {upcomingAppt.vet.name}
            </p>
          </div>
        )}
      </div>

      {/* Toggle histórico */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
      >
        Ver histórico completo
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="p-5 space-y-6 border-t border-gray-100">
          {/* Vacinas */}
          {pet.vaccines?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <Syringe className="w-4 h-4 text-green-600" />
                Vacinas
              </h3>
              <div className="space-y-2">
                {pet.vaccines.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{v.name}</p>
                      <p className="text-xs text-gray-400">
                        Aplicada em {format(new Date(v.appliedAt), 'dd/MM/yyyy')}
                        {v.lot && ` • Lote: ${v.lot}`}
                      </p>
                    </div>
                    {v.nextDoseAt && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        new Date(v.nextDoseAt) < new Date()
                          ? 'bg-red-50 text-red-600'
                          : 'bg-green-50 text-green-600'
                      }`}>
                        {new Date(v.nextDoseAt) < new Date() ? 'Atrasada' : format(new Date(v.nextDoseAt), 'dd/MM/yy')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consultas */}
          {pet.consultations?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <ClipboardList className="w-4 h-4 text-blue-600" />
                Consultas Recentes
              </h3>
              <div className="space-y-3">
                {pet.consultations.slice(0, 5).map((c: any) => (
                  <div key={c.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-800">
                        {format(new Date(c.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-gray-400">Dr(a). {c.vet.name}</p>
                    </div>
                    <p className="text-xs text-gray-600"><strong>Diagnóstico:</strong> {c.diagnosis}</p>
                    <p className="text-xs text-gray-600 mt-1"><strong>Tratamento:</strong> {c.treatment}</p>
                    {c.prescriptions?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-500">Medicamentos prescritos:</p>
                        {c.prescriptions.map((p: any) => (
                          <p key={p.id} className="text-xs text-gray-600 ml-2">
                            • {p.medication} — {p.dosage}, {p.frequency}, {p.duration}
                          </p>
                        ))}
                      </div>
                    )}
                    {c.examRequests?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-500">Exames solicitados:</p>
                        {c.examRequests.map((e: any) => (
                          <div key={e.id} className="flex items-center justify-between ml-2">
                            <p className="text-xs text-gray-600">• {e.examType}</p>
                            {e.resultUrl && (
                              <a href={e.resultUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-primary font-medium hover:underline">
                                Ver resultado
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico de peso */}
          {pet.weightRecords?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <Weight className="w-4 h-4 text-purple-600" />
                Histórico de Peso
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pet.weightRecords.slice(-8).map((w: any) => (
                  <div key={w.id} className="flex-shrink-0 text-center bg-purple-50 rounded-xl px-3 py-2">
                    <p className="text-base font-bold text-purple-700">{w.weight} kg</p>
                    <p className="text-xs text-purple-400">{format(new Date(w.measuredAt), 'dd/MM/yy')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MeusPetsPage() {
  const { data: pets = [], isLoading } = useQuery({
    queryKey: ['portal-pets'],
    queryFn:  portalPetsApi.list,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Meus Pets</h1>
        <p className="text-sm text-gray-500 mt-1">{pets.length} pet(s) cadastrado(s)</p>
      </div>

      {pets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <PawPrint className="w-12 h-12 mb-3 opacity-40" />
          <p>Nenhum pet cadastrado ainda.</p>
          <p className="text-sm mt-1">Entre em contato com a clínica.</p>
        </div>
      ) : (
        pets.map((pet: any) => <PetCard key={pet.id} pet={pet} />)
      )}
    </div>
  )
}
