import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate, tenantId } from '../middleware/auth'
import { requireActiveSubscription } from '../middleware/planGuard'
import { processConsultationAudio, isWhisperConfigured, isClaudeConfigured } from '../services/aiScribe'

export const aiScribeRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate)
  app.addHook('onRequest', requireActiveSubscription)

  /**
   * GET /api/ai-scribe/status
   * Informa se os serviços de IA estão configurados.
   */
  app.get('/status', async () => ({
    whisper: isWhisperConfigured(),
    claude:  isClaudeConfigured(),
    ready:   isWhisperConfigured(),
  }))

  /**
   * POST /api/ai-scribe/transcribe
   * Recebe áudio (multipart/form-data, campo "audio") e retorna notas SOAP estruturadas.
   *
   * Formatos aceitos: mp3, wav, m4a, webm, ogg, mp4
   * Tamanho máximo: 25 MB (limite do Whisper)
   *
   * Retorna um rascunho dos campos do prontuário — o veterinário
   * deve revisar antes de salvar a consulta.
   */
  app.post('/transcribe', async (req, reply) => {
    if (!isWhisperConfigured()) {
      return reply.status(503).send({
        error: 'Transcrição não disponível. Configure OPENAI_API_KEY.',
      })
    }

    const data = await req.file()
    if (!data) return reply.status(400).send({ error: 'Nenhum arquivo de áudio enviado' })

    const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a',
                          'audio/mp4', 'audio/webm', 'audio/ogg', 'video/webm']
    if (!allowedMimes.includes(data.mimetype)) {
      return reply.status(400).send({ error: `Formato não suportado: ${data.mimetype}. Use MP3, WAV, M4A ou WEBM.` })
    }

    const buffer = await data.toBuffer()
    if (buffer.length > 25 * 1024 * 1024) {
      return reply.status(413).send({ error: 'Arquivo muito grande (máx 25 MB)' })
    }

    try {
      const result = await processConsultationAudio(buffer, data.mimetype, data.filename)
      return reply.status(200).send(result)
    } catch (err: any) {
      app.log.error({ err }, 'AI Scribe transcription failed')
      return reply.status(500).send({ error: 'Falha na transcrição. Verifique os logs para detalhes.' })
    }
  })

  /**
   * POST /api/ai-scribe/structure
   * Estrutura texto livre (digitado) em campos SOAP usando Claude.
   * Útil quando o vet prefere digitar notas corridas ao invés de gravar áudio.
   */
  app.post('/structure', async (req, reply) => {
    if (!isClaudeConfigured()) {
      return reply.status(503).send({
        error: 'Estruturação IA não disponível. Configure ANTHROPIC_API_KEY.',
      })
    }

    const { text } = z.object({ text: z.string().min(20).max(10000) }).parse(req.body)

    try {
      // Reutiliza o serviço passando o texto como "transcrição"
      const result = await processConsultationAudio(
        Buffer.from(text),
        'text/plain',
        'notes.txt'
      )
      // Remove transcript (é o próprio texto de entrada)
      return reply.status(200).send({ ...result, transcript: text })
    } catch (err: any) {
      app.log.error({ err }, 'AI Scribe structure failed')
      return reply.status(500).send({ error: 'Falha ao estruturar notas. Verifique os logs para detalhes.' })
    }
  })
}
