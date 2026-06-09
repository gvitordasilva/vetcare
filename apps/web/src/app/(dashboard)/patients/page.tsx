'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { patientsApi } from '@/lib/api'
import { SPECIES_LABELS, SPECIES_EMOJIS, formatDate } from '@/lib/utils'
import { Search, Plus, PawPrint, ChevronRight } from 'lucide-react'
import { NewPatientDialog } from '@/components/patients/NewPatientDialog'

export default function PatientsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [newPatientOpen, setNewPatientOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['patients', search, page],
    queryFn: () => patientsApi.list({ search: search || undefined, page, pageSize: 20 }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} animais cadastrados</p>
        </div>
        <button
          onClick={() => setNewPatientOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Paciente
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar por nome do animal ou tutor..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : data?.data?.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            {/* Paw print decorativo + cão sentado */}
            <svg width="88" height="80" viewBox="0 0 88 80" fill="none" className="mb-4 opacity-40" aria-hidden>
              {/* Corpo */}
              <ellipse cx="44" cy="60" rx="26" ry="16" fill="#d1fae5"/>
              {/* Cabeça */}
              <circle cx="44" cy="36" r="18" fill="#a7f3d0"/>
              {/* Orelhas caídas */}
              <ellipse cx="28" cy="24" rx="8" ry="13" transform="rotate(-20 28 24)" fill="#6ee7b7"/>
              <ellipse cx="60" cy="24" rx="8" ry="13" transform="rotate(20 60 24)" fill="#6ee7b7"/>
              {/* Olhos com brilho */}
              <circle cx="37" cy="34" r="4" fill="#065f46"/>
              <circle cx="51" cy="34" r="4" fill="#065f46"/>
              <circle cx="38.5" cy="32.5" r="1.2" fill="white"/>
              <circle cx="52.5" cy="32.5" r="1.2" fill="white"/>
              {/* Nariz */}
              <ellipse cx="44" cy="41" rx="3.5" ry="2.5" fill="#065f46"/>
              {/* Língua */}
              <ellipse cx="44" cy="46" rx="4" ry="5" fill="#f9a8d4"/>
              <line x1="44" y1="44" x2="44" y2="51" stroke="#f472b6" strokeWidth="1"/>
              {/* Pata comemorativa */}
              <ellipse cx="24" cy="72" rx="7" ry="5" fill="#6ee7b7"/>
              <ellipse cx="17" cy="66" rx="4" ry="5" fill="#6ee7b7"/>
              <ellipse cx="22" cy="63" rx="4" ry="5" fill="#6ee7b7"/>
              <ellipse cx="28" cy="63" rx="4" ry="5" fill="#6ee7b7"/>
            </svg>
            <p className="text-gray-600 font-semibold">Ainda sem pacientes por aqui 🐾</p>
            <p className="text-gray-400 text-sm mt-1 max-w-xs">
              {search ? `Nenhum resultado para "${search}"` : 'Cadastre seu primeiro paciente e comece a atender!'}
            </p>
            {!search && (
              <button
                onClick={() => setNewPatientOpen(true)}
                className="mt-5 flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition shadow-sm hover:shadow-primary/20 hover:shadow-md"
              >
                <Plus className="w-4 h-4" /> Cadastrar primeiro paciente
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Animal</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Espécie / Raça</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Tutor</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Nascimento</th>
                <th className="px-6 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.data?.map((patient: any) => (
                <tr key={patient.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        {SPECIES_EMOJIS[patient.species]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{patient.name}</p>
                        <p className="text-xs text-gray-400">{patient.gender === 'MALE' ? 'Macho' : 'Fêmea'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700">{SPECIES_LABELS[patient.species]}</p>
                    <p className="text-xs text-gray-400">{patient.breed}</p>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <p className="text-sm text-gray-700">{patient.owner?.name}</p>
                    <p className="text-xs text-gray-400">{patient.owner?.phone}</p>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell text-sm text-gray-500">
                    {patient.birthDate ? formatDate(patient.birthDate) : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="inline-flex items-center gap-1 text-primary text-sm font-medium hover:underline"
                    >
                      Ver <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Página {data.page} de {data.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= data.totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      <NewPatientDialog open={newPatientOpen} onClose={() => setNewPatientOpen(false)} />
    </div>
  )
}
