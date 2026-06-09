'use client'

import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { patientsApi } from '@/lib/api'
import { SPECIES_LABELS, SPECIES_EMOJIS, formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft, Phone, Mail, Syringe, ClipboardList, Calendar, Weight, Camera, Loader2, Plus } from 'lucide-react'
import NewConsultationDialog from '@/components/consultations/NewConsultationDialog'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState('')
  const [consultationOpen, setConsultationOpen] = useState(false)

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientsApi.get(id),
  })

  const photoMutation = useMutation({
    mutationFn: (file: File) => patientsApi.uploadPhoto(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient', id] })
      setUploadError('')
    },
    onError: (err: any) => {
      setUploadError(err.response?.data?.error || 'Erro ao enviar foto')
    },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    photoMutation.mutate(file)
    // Limpa input para permitir selecionar o mesmo arquivo novamente
    e.target.value = ''
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!patient) return <p className="text-center text-gray-500 py-20">Paciente não encontrado</p>

  const age = patient.birthDate
    ? Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  const photoSrc = patient.photoUrl
    ? patient.photoUrl.startsWith('http') ? patient.photoUrl : `${API_URL.replace('/api', '')}${patient.photoUrl}`
    : null

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-5">
          {/* Avatar com upload */}
          <div className="relative flex-shrink-0 group">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-green-50 flex items-center justify-center">
              {photoSrc ? (
                <Image
                  src={photoSrc}
                  alt={patient.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-5xl">{SPECIES_EMOJIS[patient.species]}</span>
              )}
            </div>

            {/* Overlay de câmera ao hover */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={photoMutation.isPending}
              className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all"
              title="Alterar foto"
            >
              {photoMutation.isPending ? (
                <Loader2 className="w-5 h-5 text-white animate-spin opacity-0 group-hover:opacity-100 transition-opacity" />
              ) : (
                <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
            <p className="text-gray-500">{SPECIES_LABELS[patient.species]} · {patient.breed}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
              <span>{patient.gender === 'MALE' ? 'Macho' : 'Fêmea'}</span>
              {age !== null && <span>{age} ano{age !== 1 ? 's' : ''}</span>}
              {patient.weight && <span className="flex items-center gap-1"><Weight className="w-3.5 h-3.5" />{patient.weight} kg</span>}
              {patient.color && <span>Cor: {patient.color}</span>}
              {patient.microchip && <span>Microchip: {patient.microchip}</span>}
            </div>
            {patient.allergies && (
              <div className="mt-3 inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                ⚠️ Alergias: {patient.allergies}
              </div>
            )}
            {uploadError && (
              <p className="mt-2 text-red-500 text-xs">{uploadError}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Owner */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Tutor</h2>
          <div className="space-y-2">
            <p className="font-medium text-gray-900">{patient.owner.name}</p>
            {patient.owner.phone && (
              <a href={`tel:${patient.owner.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition">
                <Phone className="w-3.5 h-3.5" /> {patient.owner.phone}
              </a>
            )}
            {patient.owner.email && (
              <a href={`mailto:${patient.owner.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition">
                <Mail className="w-3.5 h-3.5" /> {patient.owner.email}
              </a>
            )}
          </div>
        </div>

        {/* Upcoming appointments */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Próximos Agend.
          </h2>
          {patient.appointments?.length === 0 && <p className="text-sm text-gray-400">Nenhum agendamento</p>}
          {patient.appointments?.map((a: any) => (
            <div key={a.id} className="text-sm">
              <p className="font-medium text-gray-700">{formatDateTime(a.scheduledAt)}</p>
              <p className="text-gray-400">{a.vet.name}</p>
            </div>
          ))}
        </div>

        {/* Next vaccine */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Syringe className="w-4 h-4 text-primary" /> Última Vacina
          </h2>
          {patient.vaccines?.length === 0 && <p className="text-sm text-gray-400">Nenhuma vacina</p>}
          {patient.vaccines?.[0] && (
            <div className="text-sm">
              <p className="font-medium text-gray-700">{patient.vaccines[0].name}</p>
              <p className="text-gray-500">{formatDate(patient.vaccines[0].appliedAt)}</p>
              {patient.vaccines[0].nextDoseAt && (
                <p className="text-orange-600 font-medium mt-1">
                  Próxima: {formatDate(patient.vaccines[0].nextDoseAt)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Consultation history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" /> Histórico de Consultas
          </h2>
          <button
            onClick={() => setConsultationOpen(true)}
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-primary/90 transition hover:shadow-md hover:shadow-primary/20"
          >
            <Plus className="w-3.5 h-3.5" /> Nova Consulta
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {patient.consultations?.length === 0 && (
            <p className="text-center text-gray-400 py-10 text-sm">Nenhuma consulta registrada</p>
          )}
          {patient.consultations?.map((c: any) => (
            <div key={c.id} className="px-6 py-4 hover:bg-gray-50/80 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{c.diagnosis}</p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{c.treatment}</p>
                  <p className="text-xs text-gray-400 mt-1">Dr(a). {c.vet.name} · {formatDate(c.date)}</p>
                  {c.prescriptions?.length > 0 && (
                    <p className="text-xs text-purple-600 mt-1">
                      💊 {c.prescriptions.length} prescrição(ões): {c.prescriptions.map((p: any) => p.medication).join(', ')}
                    </p>
                  )}
                </div>
                {c.weight && <span className="text-sm text-gray-400 flex-shrink-0 ml-3">{c.weight} kg</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <NewConsultationDialog
        open={consultationOpen}
        onClose={() => setConsultationOpen(false)}
        patientId={patient.id}
        patientName={patient.name}
      />
    </div>
  )
}
