'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Loader2, CheckCircle2, RefreshCw, X, Wand2, ChevronDown, ChevronUp } from 'lucide-react'
import { aiScribeApi } from '@/lib/api'

export type ScribeNotes = {
  transcript:      string
  anamnesis:       string
  physicalExam:    string
  diagnosis:       string
  treatment:       string
  prescriptions:   { medication: string; dosage: string; frequency: string; duration: string; instructions?: string }[]
  examRequests:    { examType: string; notes?: string }[]
  followUpDate?:   string
  weight?:         number
  temperature?:    number
  heartRate?:      number
  respiratoryRate?: number
}

type State = 'idle' | 'recording' | 'processing' | 'reviewing' | 'error'

type Props = { onResult: (notes: ScribeNotes) => void }

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function AIScribeRecorder({ onResult }: Props) {
  const [state, setState]           = useState<State>('idle')
  const [elapsed, setElapsed]       = useState(0)
  const [notes, setNotes]           = useState<ScribeNotes | null>(null)
  const [error, setError]           = useState('')
  const [showTranscript, setShowTranscript] = useState(false)

  const mrRef     = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (state === 'recording') {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [state])

  async function startRecording() {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/mp4'
      const mr = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => stream.getTracks().forEach((t) => t.stop())
      mr.start(1000)
      mrRef.current = mr
      setElapsed(0)
      setState('recording')
    } catch {
      setError('Microfone não disponível. Verifique as permissões do navegador.')
      setState('error')
    }
  }

  function stopRecording() {
    mrRef.current?.stop()
    setState('processing')
    // MediaRecorder.onstop é async — esperar 300ms para chunks finalizarem
    setTimeout(() => processAudio(), 300)
  }

  async function processAudio() {
    try {
      const mimeType = mrRef.current?.mimeType ?? 'audio/webm'
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const ext  = mimeType.includes('mp4') ? 'mp4' : 'webm'
      const fd   = new FormData()
      fd.append('audio', blob, `consulta.${ext}`)
      const result = await aiScribeApi.transcribe(fd)
      setNotes(result)
      setState('reviewing')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Falha ao processar o áudio. Tente novamente.')
      setState('error')
    }
  }

  function applyNotes() {
    if (notes) onResult(notes)
    reset()
  }

  function reset() {
    setState('idle')
    setNotes(null)
    setError('')
    setElapsed(0)
    setShowTranscript(false)
  }

  /* ── idle ─────────────────────────────────────────────────────── */
  if (state === 'idle') return (
    <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-2xl">
      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <Wand2 className="w-5 h-5 text-purple-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-purple-900">AI Scribe</p>
        <p className="text-xs text-purple-600">Grave a consulta — a IA preenche o prontuário automaticamente</p>
      </div>
      <button
        type="button"
        onClick={startRecording}
        className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
      >
        <Mic className="w-4 h-4" /> Gravar
      </button>
    </div>
  )

  /* ── recording ────────────────────────────────────────────────── */
  if (state === 'recording') return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-300 rounded-2xl">
      <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <Mic className="w-5 h-5 text-red-600 animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <p className="text-sm font-bold text-red-900">Gravando consulta</p>
        </div>
        <p className="text-xs font-mono text-red-600 mt-0.5">{fmt(elapsed)} — fale normalmente com o tutor</p>
      </div>
      <button
        type="button"
        onClick={stopRecording}
        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
      >
        <Square className="w-4 h-4 fill-current" /> Parar
      </button>
    </div>
  )

  /* ── processing ───────────────────────────────────────────────── */
  if (state === 'processing') return (
    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
      <Loader2 className="w-5 h-5 text-amber-600 animate-spin flex-shrink-0" />
      <div>
        <p className="text-sm font-bold text-amber-900">Processando com IA...</p>
        <p className="text-xs text-amber-600">Whisper transcrevendo → Claude estruturando prontuário</p>
      </div>
    </div>
  )

  /* ── error ────────────────────────────────────────────────────── */
  if (state === 'error') return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
      <div className="flex-1">
        <p className="text-sm font-bold text-red-900">Erro no AI Scribe</p>
        <p className="text-xs text-red-600 mt-0.5">{error}</p>
      </div>
      <button type="button" onClick={reset} className="flex items-center gap-1 text-xs text-red-700 font-medium hover:underline flex-shrink-0">
        <RefreshCw className="w-3 h-3" /> Tentar novamente
      </button>
    </div>
  )

  /* ── reviewing ────────────────────────────────────────────────── */
  return (
    <div className="border border-emerald-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-emerald-50">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <p className="text-sm font-bold text-emerald-900">Rascunho gerado pela IA — revise antes de usar</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={reset} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition">
            <X className="w-3 h-3" /> Descartar
          </button>
          <button
            type="button"
            onClick={applyNotes}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Usar rascunho
          </button>
        </div>
      </div>

      {/* Fields preview */}
      <div className="p-4 space-y-2.5 bg-white text-xs">
        {[
          { label: 'Anamnese',     value: notes?.anamnesis },
          { label: 'Exame físico', value: notes?.physicalExam },
          { label: 'Diagnóstico',  value: notes?.diagnosis },
          { label: 'Tratamento',   value: notes?.treatment },
        ].map(({ label, value }) => value ? (
          <div key={label}>
            <span className="font-bold text-emerald-800">{label}: </span>
            <span className="text-gray-700 leading-relaxed">{value}</span>
          </div>
        ) : null)}

        {notes?.prescriptions && notes.prescriptions.length > 0 && (
          <div>
            <span className="font-bold text-emerald-800">Prescrições ({notes.prescriptions.length}): </span>
            <span className="text-gray-700">{notes.prescriptions.map((p) => p.medication).join(' · ')}</span>
          </div>
        )}

        {notes?.examRequests && notes.examRequests.length > 0 && (
          <div>
            <span className="font-bold text-emerald-800">Exames ({notes.examRequests.length}): </span>
            <span className="text-gray-700">{notes.examRequests.map((e) => e.examType).join(' · ')}</span>
          </div>
        )}

        {notes?.weight && <div><span className="font-bold text-emerald-800">Peso: </span><span className="text-gray-700">{notes.weight} kg</span></div>}
        {notes?.temperature && <div><span className="font-bold text-emerald-800">Temp.: </span><span className="text-gray-700">{notes.temperature} °C</span></div>}

        {/* Transcrição completa (colapsável) */}
        {notes?.transcript && (
          <div className="pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowTranscript((s) => !s)}
              className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-medium transition"
            >
              {showTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showTranscript ? 'Ocultar' : 'Ver'} transcrição completa
            </button>
            {showTranscript && (
              <p className="mt-2 p-3 bg-gray-50 rounded-xl text-gray-500 leading-relaxed border border-gray-100 italic">
                {notes.transcript}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
