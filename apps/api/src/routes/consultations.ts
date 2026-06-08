import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate, authorize, tenantId } from '../middleware/auth'
import {
  generatePrescriptionPdf,
  generateVerificationCode,
  type PrescriptionData,
} from '../services/prescriptionPdf'

export const consultationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate)

  app.get('/', async (req) => {
    const query = z.object({
      patientId: z.string().optional(),
      vetId: z.string().optional(),
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().min(1).max(100).default(20),
    }).parse(req.query)

    const tid = tenantId(req)
    const skip = (query.page - 1) * query.pageSize

    const where = {
      tenantId: tid,
      ...(query.patientId && { patientId: query.patientId }),
      ...(query.vetId && { vetId: query.vetId }),
    }

    const [consultations, total] = await Promise.all([
      app.prisma.consultation.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, species: true } },
          vet: { select: { id: true, name: true } },
          prescriptions: true,
          examRequests: true,
        },
        skip,
        take: query.pageSize,
        orderBy: { date: 'desc' },
      }),
      app.prisma.consultation.count({ where }),
    ])

    return { data: consultations, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) }
  })

  app.get('/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid = tenantId(req)

    const consultation = await app.prisma.consultation.findFirst({
      where: { id, tenantId: tid },
      include: {
        patient: { include: { owner: true } },
        vet: { select: { id: true, name: true } },
        prescriptions: true,
        examRequests: true,
        appointment: true,
      },
    })

    if (!consultation) return reply.status(404).send({ error: 'Consulta não encontrada' })
    return consultation
  })

  // Apenas VET, ADMIN e OWNER podem criar consultas/prontuários
  app.post('/', { onRequest: [authorize('OWNER', 'ADMIN', 'VET')] }, async (req, reply) => {
    const schema = z.object({
      patientId: z.string(),
      vetId: z.string(),
      appointmentId: z.string().optional(),
      date: z.string().datetime(),
      weight: z.number().positive().optional(),
      temperature: z.number().optional(),
      heartRate: z.number().int().optional(),
      respiratoryRate: z.number().int().optional(),
      anamnesis: z.string().min(1),
      physicalExam: z.string().min(1),
      diagnosis: z.string().min(1),
      treatment: z.string().min(1),
      followUpDate: z.string().datetime().optional(),
      prescriptions: z.array(z.object({
        medication: z.string(),
        dosage: z.string(),
        frequency: z.string(),
        duration: z.string(),
        instructions: z.string().optional(),
      })).optional(),
      examRequests: z.array(z.object({
        examType: z.string(),
        laboratory: z.string().optional(),
        notes: z.string().optional(),
      })).optional(),
    })

    const data = schema.parse(req.body)
    const tid = tenantId(req)

    const [patient, vet] = await Promise.all([
      app.prisma.patient.findFirst({ where: { id: data.patientId, tenantId: tid } }),
      app.prisma.user.findFirst({ where: { id: data.vetId, tenantId: tid } }),
    ])

    if (!patient) return reply.status(404).send({ error: 'Paciente não encontrado' })
    if (!vet) return reply.status(404).send({ error: 'Veterinário não encontrado' })

    // Valida que o agendamento vinculado pertence a este tenant E a este paciente
    if (data.appointmentId) {
      const appt = await app.prisma.appointment.findFirst({
        where: { id: data.appointmentId, tenantId: tid, patientId: data.patientId },
      })
      if (!appt) {
        return reply.status(400).send({ error: 'Agendamento não encontrado ou não pertence a este paciente' })
      }
      if (appt.status === 'CANCELLED' || appt.status === 'NO_SHOW') {
        return reply.status(422).send({ error: `Não é possível criar consulta para agendamento com status ${appt.status}` })
      }
    }

    const { prescriptions, examRequests, ...rest } = data

    const consultation = await app.prisma.consultation.create({
      data: {
        ...rest,
        tenantId: tid,
        date: new Date(data.date),
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
        prescriptions: prescriptions ? { create: prescriptions } : undefined,
        examRequests: examRequests ? { create: examRequests } : undefined,
      },
      include: {
        patient: true,
        vet: { select: { id: true, name: true } },
        prescriptions: true,
        examRequests: true,
      },
    })

    // Se vinculado a agendamento, marcar como concluído
    if (data.appointmentId) {
      await app.prisma.appointment.update({
        where: { id: data.appointmentId },
        data: { status: 'COMPLETED' },
      })
    }

    // Peso: criar registro histórico e atualizar cache no paciente atomicamente
    if (data.weight) {
      await app.prisma.$transaction([
        // Histórico imutável de pesagem
        app.prisma.weightRecord.create({
          data: {
            tenantId: tid,
            patientId: data.patientId,
            consultationId: consultation.id,
            weight: data.weight,
            measuredAt: new Date(data.date),
            measuredById: data.vetId,
          },
        }),
        // Cache no paciente para exibição rápida
        app.prisma.patient.update({
          where: { id: data.patientId },
          data: { weight: data.weight },
        }),
      ])
    }

    return reply.status(201).send(consultation)
  })

  /**
   * POST /api/consultations/:consultationId/exams/:examId/result
   * Faz upload do resultado de um exame (PDF ou imagem) e marca como DONE.
   * Usa multipart/form-data com campo "file".
   */
  app.post<{ Params: { consultationId: string; examId: string } }>(
    '/:consultationId/exams/:examId/result',
    async (req, reply) => {
      const { consultationId, examId } = req.params
      const tid = tenantId(req)

      // Verifica que a consulta pertence ao tenant
      const consultation = await app.prisma.consultation.findFirst({
        where: { id: consultationId, tenantId: tid },
      })
      if (!consultation) return reply.status(404).send({ error: 'Consulta não encontrada' })

      const exam = await app.prisma.examRequest.findFirst({
        where: { id: examId, consultationId },
      })
      if (!exam) return reply.status(404).send({ error: 'Exame não encontrado' })

      const data = await req.file()
      if (!data) return reply.status(400).send({ error: 'Nenhum arquivo enviado' })

      const buffer = await data.toBuffer()
      if (buffer.length > 10 * 1024 * 1024) {
        return reply.status(413).send({ error: 'Arquivo muito grande (máx 10 MB)' })
      }

      const url = await app.saveFile(buffer, data.filename)

      const updated = await app.prisma.examRequest.update({
        where: { id: examId },
        data:  { resultUrl: url, status: 'DONE' },
      })

      return reply.status(200).send(updated)
    }
  )

  /**
   * GET /api/consultations/:id/prescription-pdf
   * Gera e retorna o PDF da prescrição de uma consulta.
   */
  app.get('/:id/prescription-pdf', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid    = tenantId(req)

    const consultation = await app.prisma.consultation.findFirst({
      where:   { id, tenantId: tid },
      include: {
        patient:       { include: { owner: true } },
        vet:           { select: { id: true, name: true } },
        prescriptions: true,
        tenant:        true,
      },
    })
    if (!consultation) return reply.status(404).send({ error: 'Consulta não encontrada' })
    if (!consultation.prescriptions.length) {
      return reply.status(422).send({ error: 'Esta consulta não possui prescrições' })
    }

    const verificationCode = generateVerificationCode(
      consultation.id, consultation.vetId, consultation.date
    )
    const baseUrl = process.env.APP_URL ?? 'https://app.vetcare.com.br'

    const pdfData: PrescriptionData = {
      verificationUrl:  `${baseUrl}/verify/${verificationCode}`,
      verificationCode,
      clinic: {
        name:    consultation.tenant.name,
        address: consultation.tenant.address,
        city:    consultation.tenant.city,
        state:   consultation.tenant.state,
        phone:   consultation.tenant.phone,
        cnpj:    consultation.tenant.cnpj ?? undefined,
      },
      patient: {
        name:    consultation.patient.name,
        species: consultation.patient.species,
        breed:   consultation.patient.breed,
        weight:  consultation.patient.weight ?? undefined,
        age:     consultation.patient.birthDate
          ? `${Math.floor((Date.now() - new Date(consultation.patient.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))} anos`
          : undefined,
      },
      owner: {
        name:  consultation.patient.owner.name,
        phone: consultation.patient.owner.phone,
        cpf:   consultation.patient.owner.cpf ?? undefined,
      },
      vet:  { name: consultation.vet.name, crmv: 'Consulte o CFMV' },
      date: consultation.date,
      medications: consultation.prescriptions.map(p => ({
        name:         p.medication,
        dosage:       p.dosage,
        quantity:     '1 unidade',
        instructions: `${p.dosage} — ${p.frequency}`,
        duration:     p.duration,
      })),
      notes: consultation.treatment,
    }

    const pdfBuffer = await generatePrescriptionPdf(pdfData)
    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `inline; filename="prescricao-${id.slice(-8)}.pdf"`)
    reply.header('Cache-Control', 'private, max-age=3600')
    return reply.send(pdfBuffer)
  })
}
