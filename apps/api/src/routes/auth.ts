import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import crypto from 'crypto'

export const authRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/auth/clinic-check?slug=minha-clinica
   * Verifica se um slug de clínica existe e está ativa.
   * Público — usado no formulário de login para feedback visual imediato.
   * Não revela informações sensíveis além de "existe/não existe/suspensa".
   */
  app.get('/clinic-check', async (req, reply) => {
    const { slug } = z.object({
      slug: z.string().min(1),
    }).parse(req.query)

    const tenant = await app.prisma.tenant.findUnique({
      where:  { slug },
      select: { id: true, name: true, active: true },
    })

    if (!tenant) {
      return reply.status(404).send({ found: false })
    }
    if (!tenant.active) {
      return reply.status(200).send({ found: true, active: false, message: 'Clínica suspensa' })
    }
    return reply.status(200).send({ found: true, active: true, name: tenant.name })
  })

  // ── Register clinic ──────────────────────────────────────────
  app.post('/register', async (req, reply) => {
    const schema = z.object({
      clinicName: z.string().min(2),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
      ownerName: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[0-9])/, {
        message: 'Senha deve ter ao menos 1 maiúscula e 1 número',
      }),
      phone: z.string().min(10),
      address: z.string().min(5),
      city: z.string().min(2),
      state: z.string().length(2),
      zipCode: z.string().min(8),
    })

    const body = schema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0].message })
    }

    const { clinicName, slug, ownerName, email, password, phone, address, city, state, zipCode } = body.data

    const slugExists = await app.prisma.tenant.findUnique({ where: { slug } })
    if (slugExists) return reply.status(409).send({ error: 'Slug já em uso' })

    const passwordHash = await bcrypt.hash(password, 12)

    const tenant = await app.prisma.tenant.create({
      data: {
        name: clinicName,
        slug,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        users: {
          create: {
            name: ownerName,
            email,
            passwordHash,
            role: 'OWNER',
          },
        },
      },
      include: { users: true },
    })

    const user = tenant.users[0]
    const { accessToken, refreshToken } = await issueTokens(app, user.id, tenant.id, user.role as any)

    return reply.status(201).send({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    })
  })

  // ── Login ────────────────────────────────────────────────────
  // Requer slug da clínica para garantir isolamento multitenant:
  // o mesmo email pode existir em múltiplas clínicas (ex: veterinário freelancer).
  // O slug identifica inequivocamente em qual clínica o usuário está entrando.
  app.post('/login', {
    config: {
      // Rate limit específico para login — 10 tentativas por minuto por IP
      // Mitiga ataques de brute force sem bloquear usuários legítimos
      rateLimit: { max: 10, timeWindow: '1 minute' },
    },
  }, async (req, reply) => {
    const schema = z.object({
      slug: z.string().min(1, 'Slug da clínica obrigatório'),
      email: z.string().email(),
      password: z.string(),
    })

    const body = schema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.errors[0].message })

    const { slug, email, password } = body.data

    // Busca o tenant pelo slug primeiro — falha rápida e segura
    const tenant = await app.prisma.tenant.findUnique({ where: { slug } })
    if (!tenant) {
      // Mesma mensagem genérica para não vazar informação sobre slugs existentes
      return reply.status(401).send({ error: 'Clínica, email ou senha incorretos' })
    }

    if (!tenant.active) {
      return reply.status(403).send({ error: 'Clínica suspensa. Entre em contato com o suporte.' })
    }

    // Busca o usuário DENTRO deste tenant específico
    const user = await app.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    })

    // Compara senha em tempo constante — bcrypt.compare já é resistente a timing attacks
    const validPassword = user ? await bcrypt.compare(password, user.passwordHash) : false

    if (!user || !validPassword || !user.active) {
      return reply.status(401).send({ error: 'Clínica, email ou senha incorretos' })
    }

    const { accessToken, refreshToken } = await issueTokens(app, user.id, user.tenantId, user.role as any)

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, logoUrl: tenant.logoUrl },
    }
  })

  // ── Refresh token ────────────────────────────────────────────
  app.post('/refresh', async (req, reply) => {
    const schema = z.object({ refreshToken: z.string() })
    const body = schema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: 'Token ausente' })

    const stored = await app.prisma.refreshToken.findUnique({
      where: { token: body.data.refreshToken },
      include: { user: true },
    })

    if (!stored || stored.expiresAt < new Date()) {
      return reply.status(401).send({ error: 'Refresh token inválido ou expirado' })
    }

    // Usuário pode ter sido desativado após o token ser emitido
    if (!stored.user.active) {
      await app.prisma.refreshToken.delete({ where: { id: stored.id } })
      return reply.status(401).send({ error: 'Conta desativada' })
    }

    await app.prisma.refreshToken.delete({ where: { id: stored.id } })

    const { accessToken, refreshToken } = await issueTokens(
      app,
      stored.user.id,
      stored.user.tenantId,
      stored.user.role as any
    )

    return { accessToken, refreshToken }
  })

  // ── Logout ───────────────────────────────────────────────────
  app.post('/logout', async (req, reply) => {
    const schema = z.object({ refreshToken: z.string() })
    const body = schema.safeParse(req.body)
    if (body.success) {
      await app.prisma.refreshToken.deleteMany({
        where: { token: body.data.refreshToken },
      })
    }
    return { message: 'Logout realizado' }
  })
}

async function issueTokens(app: any, userId: string, tenantId: string, role: string) {
  // Access token expira em 15 minutos — força refresh periódico e limita janela de abuso
  const accessToken = app.jwt.sign({ sub: userId, tid: tenantId, role }, { expiresIn: '15m' })

  const rawToken = crypto.randomBytes(40).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  await app.prisma.refreshToken.create({
    data: { userId, token: rawToken, expiresAt },
  })

  return { accessToken, refreshToken: rawToken }
}
