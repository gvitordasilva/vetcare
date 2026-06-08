/**
 * AI Scribe — transcrição e estruturação automática de consultas veterinárias.
 *
 * Fluxo:
 *   1. Recebe áudio da consulta (MP3, WAV, M4A, WEBM)
 *   2. Transcreve via OpenAI Whisper API (melhor modelo de ASR para pt-BR)
 *   3. Envia transcrição ao Claude Sonnet para estruturar em formato SOAP
 *   4. Retorna campos prontos para preencher o prontuário
 *
 * Variáveis de ambiente:
 *   OPENAI_API_KEY      – para transcrição Whisper
 *   ANTHROPIC_API_KEY   – para estruturação Claude
 *
 * Se ANTHROPIC_API_KEY não estiver configurado, retorna apenas a transcrição
 * bruta (o médico estrutura manualmente).
 */

import Anthropic from '@anthropic-ai/sdk'

export interface ScribedSoapNotes {
  transcript:      string    // transcrição bruta
  anamnesis:       string    // queixa principal + histórico
  physicalExam:    string    // exame físico objetivo
  diagnosis:       string    // diagnóstico / suspeita diagnóstica
  treatment:       string    // plano terapêutico
  prescriptions:   { medication: string; dosage: string; frequency: string; duration: string; instructions?: string }[]
  examRequests:    { examType: string; notes?: string }[]
  followUpDate?:   string    // ISO 8601 se mencionado
  weight?:         number
  temperature?:    number
  heartRate?:      number
  respiratoryRate?: number
}

/** Transcreve áudio usando OpenAI Whisper API (via fetch — sem SDK) */
async function transcribeAudio(audioBuffer: Buffer, mimetype: string, filename: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurado')

  const formData = new FormData()
  const blob     = new Blob([audioBuffer], { type: mimetype })
  formData.append('file', blob, filename)
  formData.append('model', 'whisper-1')
  formData.append('language', 'pt')
  formData.append('prompt', 'Consulta veterinária em português brasileiro. Termos médicos e de medicamentos.')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method:  'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body:    formData,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Whisper API error (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.text ?? ''
}

/** Estrutura a transcrição bruta em campos SOAP usando Claude */
async function structureSoap(transcript: string): Promise<Partial<ScribedSoapNotes>> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return {}  // sem chave — retorna vazio, só a transcrição

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model:      'claude-sonnet-4-5',
    max_tokens: 2048,
    messages:   [{
      role:    'user',
      content: `Você é um assistente de registro médico veterinário especializado. Analise a transcrição abaixo de uma consulta veterinária e extraia as informações para preencher um prontuário SOAP (Subjetivo, Objetivo, Avaliação, Plano).

TRANSCRIÇÃO:
${transcript}

Responda APENAS com um JSON válido seguindo EXATAMENTE esta estrutura (todos os campos opcionais podem ser null):
{
  "anamnesis": "queixa principal, histórico clínico e informações relatadas pelo tutor",
  "physicalExam": "achados do exame físico objetivo",
  "diagnosis": "diagnóstico ou suspeita diagnóstica",
  "treatment": "plano de tratamento descrito",
  "weight": null,
  "temperature": null,
  "heartRate": null,
  "respiratoryRate": null,
  "followUpDate": null,
  "prescriptions": [
    {
      "medication": "nome do medicamento",
      "dosage": "dose",
      "frequency": "frequência",
      "duration": "duração",
      "instructions": "instruções adicionais ou null"
    }
  ],
  "examRequests": [
    {
      "examType": "tipo de exame solicitado",
      "notes": "observações ou null"
    }
  ]
}`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  // Extrair JSON da resposta (Claude pode incluir texto antes/depois)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return {}

  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    return {}
  }
}

/** Processa áudio e retorna notas SOAP estruturadas */
export async function processConsultationAudio(
  audioBuffer: Buffer,
  mimetype:    string,
  filename:    string
): Promise<ScribedSoapNotes> {
  // 1. Transcrição
  const transcript = await transcribeAudio(audioBuffer, mimetype, filename)

  // 2. Estruturação com Claude (opcional)
  const structured = await structureSoap(transcript)

  return {
    transcript,
    anamnesis:       structured.anamnesis       ?? '',
    physicalExam:    structured.physicalExam    ?? '',
    diagnosis:       structured.diagnosis       ?? '',
    treatment:       structured.treatment       ?? '',
    prescriptions:   structured.prescriptions   ?? [],
    examRequests:    structured.examRequests    ?? [],
    followUpDate:    structured.followUpDate,
    weight:          structured.weight          ?? undefined,
    temperature:     structured.temperature     ?? undefined,
    heartRate:       structured.heartRate       ?? undefined,
    respiratoryRate: structured.respiratoryRate ?? undefined,
  }
}

export function isWhisperConfigured():  boolean { return !!process.env.OPENAI_API_KEY }
export function isClaudeConfigured():   boolean { return !!process.env.ANTHROPIC_API_KEY }
