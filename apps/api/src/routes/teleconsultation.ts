/**
 * Telemedicina veterinária via Daily.co
 *
 * Fluxo:
 *   1. Staff cria sala vinculada a um agendamento
 *   2. Sistema gera link seguro por participante (vet e tutor)
 *   3. Tutor acessa pelo portal, vet acessa pelo dashboard
 *   4. Ao finalizar, sala é encerrada e notas podem ser adicionadas
 *
 * Variáveis de ambiente:
 *   DAILY_API_KEY      – chave da API Daily.co
 *   DAILY_DOMAIN       – subdomínio Daily.co (ex: "vetcare")
 *
 * Docs: https://docs.daily.co/reference/rest-api
 */

import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate, authorize, tenantId } from '../middleware/auth'

const DAILY_BASE = 'https://api.daily.co/v1'

async function dailyRequest(method: string, path: string, body?: object): Promise<any> {
  const apiKey = process.env.DAILY_API_KEY
  if (!apiKey) throw new Error('DAILY_API_KEY não configurado')

  const res = await fetch(`${DAILY_BASE}${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Daily.co ${method} ${path} (${res.status}): ${err}`)
  }

  return res.json()
}

async function createRoom(name: string, expiresAt: Date): Promise<{ url: string; name: string }> {
  const room = await dailyRequest('POST', '/rooms', {
    name,
    properties: {
      exp:           Math.floor(expiresAt.getTime() / 1000),
      max_participants: 5,
      enable_chat:   true,
      enable_knocking: false,
      enable_recording: 'cloud',
    },
  })
  return { url: room.url, name: room.name }
}

async function createMeetingToken(roomName: string, participantName: string, isOwner: boolean): Promise<string> {
  const token = await dailyRequest('POST', '/meeting-tokens', {
    properties: {
      room_name:     roomName,
      user_name:     participantName,
      is_owner:      isOwner,
      exp:           Math.floor((Date.now() + 4 * 3600 * 1000) / 1000), // 4h
      eject_at_token_exp: true,
    },
  })
  return token.token
}

function isDailyConfigured(): boolean {
  return !!process.env.DAILY_API_KEY
}

export const teleconsultationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate)

  /**
   * GET /api/teleconsultation/status
   */
  app.get('/status', async () => ({ configured: isDailyConfigured() }))

  /**
   * GET /api/teleconsultation
   * Lista teleconsultas do tenant.
   */
  app.get('/', async (req) => {
    const query = z.object({
      status:   z.string().optional(),
      page:     z.coerce.number().default(1),
      pageSize: z.coerce.number().min(1).max(100).default(20),
    }).parse(req.query)

    const tid  = tenantId(req)
    const skip = (query.page - 1) * query.pageSize

    const where: any = { tenantId: tid }
    if (query.status) where.status = query.status

    const [items, total] = await Promise.all([
      app.prisma.teleconsultationRoom.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, species: true } },
          vet:     { select: { id: true, name: true } },
        },
        skip,
        take:    query.pageSize,
        orderBy: { scheduledAt: 'desc' },
      }),
      app.prisma.teleconsultationRoom.count({ where }),
    ])

    return { data: items, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) }
  })

  /**
   * POST /api/teleconsultation
   * Cria sala de teleconsulta para um agendamento.
   */
  app.post('/', { onRequest: [authorize('OWNER', 'ADMIN', 'VET', 'RECEPTIONIST')] }, async (req, reply) => {
    const schema = z.object({
      appointmentId: z.string().optional(),
      patientId:     z.string(),
      vetId:         z.string(),
      scheduledAt:   z.string().datetime(),
    })

    const data = schema.parse(req.body)
    const tid  = tenantId(req)

    // Verificar que paciente e vet existem no tenant
    const [patient, vet] = await Promise.all([
      app.prisma.patient.findFirst({ where: { id: data.patientId, tenantId: tid } }),
      app.prisma.user.findFirst({ where: { id: data.vetId, tenantId: tid } }),
    ])
    if (!patient) return reply.status(404).send({ error: 'Paciente não encontrado' })
    if (!vet)     return reply.status(404).send({ error: 'Veterinário não encontrado' })

    if (!isDailyConfigured()) {
      // Modo demonstração: retorna sala simulada
      const fakeRoom = await app.prisma.teleconsultationRoom.create({
        data: {
          tenantId:      tid,
          patientId:     data.patientId,
          vetId:         data.vetId,
          appointmentId: data.appointmentId,
          scheduledAt:   new Date(data.scheduledAt),
          roomUrl:       `https://demo.daily.co/vetcare-${Date.now()}`,
          dailyRoomName: `vetcare-${Date.now()}`,
        },
        include: {
          patient: { select: { id: true, name: true } },
          vet:     { select: { id: true, name: true } },
        },
      })
      return reply.status(201).send({
        ...fakeRoom,
        _demo: true,
        _notice: 'Configure DAILY_API_KEY para salas reais',
      })
    }

    // Criar sala real no Daily.co
    const scheduledAt = new Date(data.scheduledAt)
    const expiresAt   = new Date(scheduledAt.getTime() + 4 * 3600 * 1000) // +4h
    const roomName    = `vetcare-${tid.slice(-6)}-${Date.now()}`

    const { url, name } = await createRoom(roomName, expiresAt)

    const room = await app.prisma.teleconsultationRoom.create({
      data: {
        tenantId:      tid,
        patientId:     data.patientId,
        vetId:         data.vetId,
        appointmentId: data.appointmentId,
        scheduledAt,
        roomUrl:       url,
        dailyRoomName: name,
      },
      include: {
        patient: { select: { id: true, name: true } },
        vet:     { select: { id: true, name: true } },
      },
    })

    return reply.status(201).send(room)
  })

  /**
   * GET /api/teleconsultation/:id/join
   * Gera token de participação para o vet (staff autenticado).
   */
  app.get('/:id/join', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid    = tenantId(req)

    const room = await app.prisma.teleconsultationRoom.findFirst({
      where:   { id, tenantId: tid },
      include: { vet: { select: { name: true } } },
    })
    if (!room) return reply.status(404).send({ error: 'Sala não encontrada' })
    if (room.status === 'ENDED' || room.status === 'CANCELLED') {
      return reply.status(422).send({ error: 'Sessão encerrada' })
    }

    if (!isDailyConfigured()) {
      return { url: room.roomUrl, token: null, _demo: true }
    }

    const token = await createMeetingToken(room.dailyRoomName, room.vet.name, true)

    // Marcar como ACTIVE na primeira entrada
    if (room.status === 'WAITING') {
      await app.prisma.teleconsultationRoom.update({
        where: { id },
        data:  { status: 'ACTIVE', startedAt: new Date() },
      })
    }

    return { url: `${room.roomUrl}?t=${token}`, token }
  })

  /**
   * PATCH /api/teleconsultation/:id/end
   * Encerra a sessão de telemedicina.
   */
  app.patch('/:id/end', { onRequest: [authorize('OWNER', 'ADMIN', 'VET')] }, async (req, reply) => {
    const { id }   = z.object({ id: z.string() }).parse(req.params)
    const { notes } = z.object({ notes: z.string().optional() }).parse(req.body)
    const tid      = tenantId(req)

    const room = await app.prisma.teleconsultationRoom.findFirst({ where: { id, tenantId: tid } })
    if (!room) return reply.status(404).send({ error: 'Sala não encontrada' })

    const updated = await app.prisma.teleconsultationRoom.update({
      where: { id },
      data:  { status: 'ENDED', endedAt: new Date(), notes },
    })

    // Tentar deletar sala no Daily.co
    if (isDailyConfigured() && room.dailyRoomName) {
      dailyRequest('DELETE', `/rooms/${room.dailyRoomName}`).catch(() => {})
    }

    return updated
  })
}
