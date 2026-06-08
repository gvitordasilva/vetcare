import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate, authorize, tenantId } from '../middleware/auth'
import * as nuvemFiscal from '../services/nuvemFiscal'

export const fiscalRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate)

  /**
   * GET /api/fiscal
   * Lista documentos fiscais emitidos pelo tenant.
   */
  app.get('/', async (req) => {
    const query = z.object({
      status:   z.string().optional(),
      type:     z.string().optional(),
      page:     z.coerce.number().default(1),
      pageSize: z.coerce.number().min(1).max(100).default(20),
    }).parse(req.query)

    const tid  = tenantId(req)
    const skip = (query.page - 1) * query.pageSize

    const where: any = { tenantId: tid }
    if (query.status) where.status = query.status
    if (query.type)   where.type   = query.type

    const [docs, total] = await Promise.all([
      app.prisma.fiscalDocument.findMany({
        where,
        include: { invoice: { select: { id: true, number: true, total: true } } },
        skip,
        take:    query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      app.prisma.fiscalDocument.count({ where }),
    ])

    return { data: docs, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) }
  })

  /**
   * POST /api/fiscal/emit
   * Emite uma NFS-e (serviço veterinário) vinculada a uma cobrança.
   * Requer dados fiscais configurados no tenant (CNPJ, IM).
   */
  app.post('/emit', { onRequest: [authorize('OWNER', 'ADMIN')] }, async (req, reply) => {
    const schema = z.object({
      invoiceId: z.string(),
      type:      z.enum(['NFE', 'NFSE']).default('NFSE'),
    })

    const data = schema.parse(req.body)
    const tid  = tenantId(req)

    // Verificar configuração fiscal
    if (!nuvemFiscal.isConfigured()) {
      return reply.status(503).send({
        error: 'Integração fiscal não configurada. Configure as variáveis NUVEM_FISCAL_CLIENT_ID e NUVEM_FISCAL_CLIENT_SECRET.',
      })
    }

    // Buscar dados do tenant
    const tenant = await app.prisma.tenant.findUnique({ where: { id: tid } })
    if (!tenant?.cnpj) {
      return reply.status(422).send({ error: 'CNPJ da clínica não configurado. Acesse Configurações → Fiscal.' })
    }

    // Buscar invoice com owner e items
    const invoice = await app.prisma.invoice.findFirst({
      where:   { id: data.invoiceId, tenantId: tid },
      include: { owner: true, items: true, fiscalDocument: true },
    })
    if (!invoice) return reply.status(404).send({ error: 'Cobrança não encontrada' })
    if (invoice.status !== 'PAID') return reply.status(422).send({ error: 'Só é possível emitir nota fiscal para cobranças pagas' })
    if (invoice.fiscalDocument) return reply.status(409).send({ error: 'Nota fiscal já emitida para esta cobrança' })

    // Criar documento fiscal em PENDING
    const doc = await app.prisma.fiscalDocument.create({
      data: {
        tenantId:  tid,
        invoiceId: invoice.id,
        type:      data.type,
        status:    'PROCESSING',
      },
    })

    // Emitir de forma assíncrona para não bloquear a resposta
    setImmediate(async () => {
      try {
        let result: any

        if (data.type === 'NFSE') {
          result = await nuvemFiscal.emitirNfse({
            cnpjPrestador:    tenant.cnpj!,
            imPrestador:      tenant.im ?? undefined,
            nomePrestador:    tenant.name,
            cpfTomador:       invoice.owner?.cpf ?? undefined,
            nomeTomador:      invoice.owner?.name ?? 'Consumidor Final',
            emailTomador:     invoice.owner?.email ?? undefined,
            descricaoServico: invoice.items.map(i => i.description).join(', '),
            valorServico:     invoice.total,
            itemListaServico: '14.01',  // serviços veterinários
          })
        } else {
          result = await nuvemFiscal.emitirNfe({
            cnpjEmitente:  tenant.cnpj!,
            ieEmitente:    tenant.ie ?? undefined,
            nomeEmitente:  tenant.name,
            enderecoEmitente: {
              logradouro: tenant.address,
              numero:     '0',
              cidade:     tenant.city,
              uf:         tenant.state,
              cep:        tenant.zipCode,
            },
            cpfDestinatario: invoice.owner?.cpf ?? undefined,
            nomeDestinatario: invoice.owner?.name ?? 'Consumidor Final',
            emailDestinatario: invoice.owner?.email ?? undefined,
            itens: invoice.items.map(i => ({
              descricao:    i.description,
              quantidade:   i.quantity,
              valorUnitario: i.unitPrice,
            })),
            valorTotal:        invoice.total,
            naturezaOperacao:  'Venda de Mercadoria',
          })
        }

        // Salvar resultado
        await app.prisma.fiscalDocument.update({
          where: { id: doc.id },
          data:  {
            status:     'AUTHORIZED',
            externalId: result.id ?? result.uuid,
            number:     result.numero ?? result.number,
            accessKey:  result.chave_acesso ?? result.access_key,
            protocol:   result.protocolo ?? result.protocol,
            issuedAt:   new Date(),
          },
        })
      } catch (err: any) {
        await app.prisma.fiscalDocument.update({
          where: { id: doc.id },
          data:  {
            status:       'REJECTED',
            errorMessage: err.message ?? String(err),
          },
        })
        app.log.error({ err }, `Fiscal emission failed for doc ${doc.id}`)
      }
    })

    return reply.status(202).send({
      message: 'Emissão da nota fiscal iniciada. Consulte o status em instantes.',
      fiscalDocumentId: doc.id,
    })
  })

  /**
   * GET /api/fiscal/:id
   * Status de um documento fiscal. Sincroniza com Nuvem Fiscal se PROCESSING.
   */
  app.get('/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const tid    = tenantId(req)

    const doc = await app.prisma.fiscalDocument.findFirst({
      where:   { id, tenantId: tid },
      include: { invoice: { select: { id: true, number: true, total: true } } },
    })
    if (!doc) return reply.status(404).send({ error: 'Documento fiscal não encontrado' })

    // Se ainda processando, consultar provedor
    if (doc.status === 'PROCESSING' && doc.externalId && nuvemFiscal.isConfigured()) {
      try {
        const remote = doc.type === 'NFSE'
          ? await nuvemFiscal.consultarNfse(doc.externalId)
          : await nuvemFiscal.consultarNfe(doc.externalId)

        const status = remote.status === 'autorizado' ? 'AUTHORIZED'
          : remote.status === 'cancelado' ? 'CANCELLED'
          : remote.status === 'rejeitado' ? 'REJECTED'
          : doc.status

        if (status !== doc.status) {
          const updated = await app.prisma.fiscalDocument.update({
            where: { id },
            data:  { status, pdfUrl: remote.pdf_url ?? remote.pdfUrl, xmlUrl: remote.xml_url ?? remote.xmlUrl },
          })
          return updated
        }
      } catch {
        // silencioso — retorna estado atual
      }
    }

    return doc
  })

  /**
   * POST /api/fiscal/:id/cancel
   * Cancela uma NF-e / NFS-e autorizada.
   */
  app.post('/:id/cancel', { onRequest: [authorize('OWNER', 'ADMIN')] }, async (req, reply) => {
    const { id }          = z.object({ id: z.string() }).parse(req.params)
    const { justificativa } = z.object({ justificativa: z.string().min(15) }).parse(req.body)
    const tid             = tenantId(req)

    const doc = await app.prisma.fiscalDocument.findFirst({ where: { id, tenantId: tid } })
    if (!doc)                      return reply.status(404).send({ error: 'Documento não encontrado' })
    if (doc.status !== 'AUTHORIZED') return reply.status(422).send({ error: 'Apenas documentos autorizados podem ser cancelados' })
    if (!doc.externalId)           return reply.status(422).send({ error: 'ID externo não encontrado' })

    try {
      if (doc.type === 'NFSE') {
        await nuvemFiscal.cancelarNfse(doc.externalId)
      } else {
        await nuvemFiscal.cancelarNfe(doc.externalId, justificativa)
      }

      const updated = await app.prisma.fiscalDocument.update({
        where: { id },
        data:  { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: justificativa },
      })
      return updated
    } catch (err: any) {
      return reply.status(422).send({ error: `Cancelamento falhou: ${err.message}` })
    }
  })
}
