'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Trash2, ClipboardList, Loader2 } from 'lucide-react'
import { consultationsApi, tenantApi } from '@/lib/api'
import { getUser } from '@/lib/auth'
import AIScribeRecorder, { type ScribeNotes } from './AIScribeRecorder'
import { cn } from '@/lib/utils'

type Prescription = { medication: string; dosage: string; frequency: string; duration: string; instructions: string }
type ExamRequest   = { examType: string; notes: string }

type Form = {
  vetId:          string
  date:           string
  weight:         string
  temperature:    string
  heartRate:      string
  respiratoryRate: string
  anamnesis:      string
  physicalExam:   string
  diagnosis:      string
  treatment:      string
  followUpDate:   string
}

const EMPTY_FORM: Form = {
  vetId: '', date: new Date().toISOString().slice(0, 16),
  weight: '', temperature: '', heartRate: '', respiratoryRate: '',
  anamnesis: '', physicalExam: '', diagnosis: '', treatment: '', followUpDate: '',
}

const EMPTY_PRESCRIPTION: Prescription = { medication: '', dosage: '', frequency: '', duration: '', instructions: '' }
const EMPTY_EXAM: ExamRequest = { examType: '', notes: '' }

type Props = {
  open:       boolean
  onClose:    () => void
  patientId:  string
  patientName: string
}

export default function NewConsultationDialog({ open, onClose, patientId, patientName }: Props) {
  const qc   = useQueryClient()
  const user = getUser()

  const [form, setForm]                   = useState<Form>({ ...EMPTY_FORM, vetId: user?.id ?? '' })
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [exams, setExams]                 = useState<ExamRequest[]>([])
  const [error, setError]                 = useState('')

  // Lista de veterinários da clínica
  const { data: staff = [] } = useQuery({
    queryKey: ['tenant-users'],
    queryFn:  tenantApi.users,
    enabled:  open,
  })
  const vets = staff.filter((u: any) => ['VET', 'OWNER', 'ADMIN'].includes(u.role))

  const create = useMutation({
    mutationFn: (payload: any) => consultationsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient', patientId] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      handleClose()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? 'Erro ao salvar consulta. Verifique os campos.')
    },
  })

  function handleClose() {
    setForm({ ...EMPTY_FORM, vetId: user?.id ?? '' })
    setPrescriptions([])
    setExams([])
    setError('')
    onClose()
  }

  /* Aplica notas vindas do AI Scribe no formulário */
  function applyScribe(notes: ScribeNotes) {
    setForm((f) => ({
      ...f,
      anamnesis:       notes.anamnesis    || f.anamnesis,
      physicalExam:    notes.physicalExam || f.physicalExam,
      diagnosis:       notes.diagnosis    || f.diagnosis,
      treatment:       notes.treatment    || f.treatment,
      weight:          notes.weight       ? String(notes.weight)       : f.weight,
      temperature:     notes.temperature  ? String(notes.temperature)  : f.temperature,
      heartRate:       notes.heartRate    ? String(notes.heartRate)    : f.heartRate,
      respiratoryRate: notes.respiratoryRate ? String(notes.respiratoryRate) : f.respiratoryRate,
      followUpDate:    notes.followUpDate ? notes.followUpDate.slice(0, 16) : f.followUpDate,
    }))
    if (notes.prescriptions?.length) {
      setPrescriptions(notes.prescriptions.map((p) => ({ ...p, instructions: p.instructions ?? '' })))
    }
    if (notes.examRequests?.length) {
      setExams(notes.examRequests.map((e) => ({ examType: e.examType, notes: e.notes ?? '' })))
    }
  }

  function set(field: keyof Form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
    }
  }

  function updatePrescription(i: number, field: keyof Prescription, value: string) {
    setPrescriptions((ps) => ps.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  function updateExam(i: number, field: keyof ExamRequest, value: string) {
    setExams((es) => es.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.vetId)       return setError('Selecione o veterinário responsável.')
    if (!form.anamnesis)   return setError('Anamnese é obrigatória.')
    if (!form.physicalExam) return setError('Exame físico é obrigatório.')
    if (!form.diagnosis)   return setError('Diagnóstico é obrigatório.')
    if (!form.treatment)   return setError('Tratamento é obrigatório.')

    const invalidPrescription = prescriptions.some(
      (p) => !p.medication || !p.dosage || !p.frequency || !p.duration,
    )
    if (invalidPrescription) return setError('Preencha todos os campos das prescrições ou remova as vazias.')

    const invalidExam = exams.some((ex) => !ex.examType)
    if (invalidExam) return setError('Preencha o tipo dos exames solicitados ou remova os vazios.')

    create.mutate({
      patientId,
      vetId:          form.vetId,
      date:           new Date(form.date).toISOString(),
      weight:         form.weight         ? parseFloat(form.weight)         : undefined,
      temperature:    form.temperature    ? parseFloat(form.temperature)    : undefined,
      heartRate:      form.heartRate      ? parseInt(form.heartRate)        : undefined,
      respiratoryRate: form.respiratoryRate ? parseInt(form.respiratoryRate) : undefined,
      anamnesis:      form.anamnesis,
      physicalExam:   form.physicalExam,
      diagnosis:      form.diagnosis,
      treatment:      form.treatment,
      followUpDate:   form.followUpDate   ? new Date(form.followUpDate).toISOString() : undefined,
      prescriptions:  prescriptions.length ? prescriptions : undefined,
      examRequests:   exams.length ? exams.map((e) => ({ examType: e.examType, notes: e.notes || undefined })) : undefined,
    })
  }

  if (!open) return null

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition'
  const textareaCls = cn(inputCls, 'resize-none leading-relaxed')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Nova Consulta</h2>
              <p className="text-xs text-gray-400">{patientName}</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* AI Scribe */}
          <AIScribeRecorder onResult={applyScribe} />

          {/* Vet + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Veterinário *</label>
              <select value={form.vetId} onChange={set('vetId')} className={inputCls} required>
                <option value="">Selecionar...</option>
                {vets.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Data e hora *</label>
              <input type="datetime-local" value={form.date} onChange={set('date')} className={inputCls} required />
            </div>
          </div>

          {/* Vitais */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sinais Vitais</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { field: 'weight' as const,          label: 'Peso (kg)',    placeholder: '4.5' },
                { field: 'temperature' as const,     label: 'Temp. (°C)',   placeholder: '38.5' },
                { field: 'heartRate' as const,       label: 'FC (bpm)',     placeholder: '120' },
                { field: 'respiratoryRate' as const, label: 'FR (rpm)',     placeholder: '20' },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <input
                    type="number" step="any" placeholder={placeholder}
                    value={form[field]} onChange={set(field)}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* SOAP */}
          {[
            { field: 'anamnesis' as const,    label: 'Anamnese *',     rows: 3, placeholder: 'Queixa principal, histórico relatado pelo tutor...' },
            { field: 'physicalExam' as const, label: 'Exame Físico *', rows: 3, placeholder: 'Achados objetivos do exame físico...' },
            { field: 'diagnosis' as const,    label: 'Diagnóstico *',  rows: 2, placeholder: 'Diagnóstico definitivo ou suspeita diagnóstica...' },
            { field: 'treatment' as const,    label: 'Tratamento *',   rows: 2, placeholder: 'Conduta terapêutica, orientações ao tutor...' },
          ].map(({ field, label, rows, placeholder }) => (
            <div key={field}>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">{label}</label>
              <textarea
                rows={rows}
                placeholder={placeholder}
                value={form[field]}
                onChange={set(field)}
                className={textareaCls}
                required
              />
            </div>
          ))}

          {/* Retorno */}
          <div className="max-w-xs">
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Data de Retorno</label>
            <input type="datetime-local" value={form.followUpDate} onChange={set('followUpDate')} className={inputCls} />
          </div>

          {/* Prescrições */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prescrições</p>
              <button
                type="button"
                onClick={() => setPrescriptions((ps) => [...ps, { ...EMPTY_PRESCRIPTION }])}
                className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
              >
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            {prescriptions.length === 0 && (
              <p className="text-xs text-gray-400 italic">Nenhuma prescrição — clique em Adicionar.</p>
            )}
            <div className="space-y-3">
              {prescriptions.map((p, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600">Prescrição {i + 1}</span>
                    <button type="button" onClick={() => setPrescriptions((ps) => ps.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <input placeholder="Medicamento *" value={p.medication} onChange={(e) => updatePrescription(i, 'medication', e.target.value)} className={inputCls} required />
                    </div>
                    <input placeholder="Dose *" value={p.dosage} onChange={(e) => updatePrescription(i, 'dosage', e.target.value)} className={inputCls} required />
                    <input placeholder="Frequência *" value={p.frequency} onChange={(e) => updatePrescription(i, 'frequency', e.target.value)} className={inputCls} required />
                    <input placeholder="Duração *" value={p.duration} onChange={(e) => updatePrescription(i, 'duration', e.target.value)} className={inputCls} required />
                    <input placeholder="Instruções (opcional)" value={p.instructions} onChange={(e) => updatePrescription(i, 'instructions', e.target.value)} className={inputCls} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exames */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Exames Solicitados</p>
              <button
                type="button"
                onClick={() => setExams((es) => [...es, { ...EMPTY_EXAM }])}
                className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
              >
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            {exams.length === 0 && (
              <p className="text-xs text-gray-400 italic">Nenhum exame — clique em Adicionar.</p>
            )}
            <div className="space-y-2">
              {exams.map((ex, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input placeholder="Tipo do exame *" value={ex.examType} onChange={(e) => updateExam(i, 'examType', e.target.value)} className={cn(inputCls, 'flex-1')} required />
                  <input placeholder="Observações" value={ex.notes} onChange={(e) => updateExam(i, 'notes', e.target.value)} className={cn(inputCls, 'flex-1')} />
                  <button type="button" onClick={() => setExams((es) => es.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 transition flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
          {error && (
            <p className="text-xs text-red-600 mb-3 px-1">{error}</p>
          )}
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={handleClose} className="px-5 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100 font-medium transition">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-sm hover:shadow-primary/20 hover:shadow-md"
            >
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
              {create.isPending ? 'Salvando...' : 'Salvar Consulta'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
