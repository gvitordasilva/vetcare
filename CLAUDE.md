# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

VetCare — SaaS multitenant para gestão de clínicas veterinárias. Monorepo npm workspaces com três pacotes:

- `apps/api` — Fastify REST API (porta 3001)
- `apps/web` — Next.js 14 App Router frontend (porta 3000)
- `packages/shared` — tipos TypeScript compartilhados entre api e web

## Commands

Todos os comandos devem ser rodados na raiz do monorepo (`vetcare/`), exceto onde indicado.

```bash
# Desenvolvimento (sobe API + frontend em paralelo)
npm run dev

# Banco de dados
npm run db:migrate        # cria/aplica migrations (usa prisma migrate dev)
npm run db:seed           # popula dados de demonstração
npm run db:generate       # regenera Prisma Client após mudanças no schema

# Rodar API isolada
cd apps/api && npm run dev        # tsx watch src/server.ts

# Rodar frontend isolado
cd apps/web && npm run dev        # next dev

# Build completo (shared → api → web)
npm run build

# Prisma Studio (visualizar banco)
cd apps/api && npm run db:studio
```

### Adicionando uma migration

```bash
cd apps/api
npx prisma migrate dev --name "nome_descritivo"
```

Sempre reinicie a API após migrations — o `tsx watch` não recarrega o Prisma Client automaticamente quando outra instância já está rodando (erro `EPERM`).

## Arquitetura

### Multi-tenancy

Cada clínica é um **Tenant**. O isolamento é feito em nível de aplicação: todo model de dados tem `tenantId` e **toda query de negócio deve filtrar por `tenantId`**. Use sempre `tenantId(req)` do middleware para obter o id do tenant logado — nunca confie em um `tenantId` vindo do body/params.

### Camadas de usuário

```
SuperAdmin (plataforma)       → JWT sem tid, role = SUPERADMIN
  └── cria Tenants (clínicas)
       └── Users por tenant   → JWT com tid, role = OWNER|ADMIN|VET|RECEPTIONIST
```

O JWT do superadmin **não tem `tid`**. O JWT de usuário de clínica **sempre tem `tid`**.

### API — Fastify

Cada módulo de negócio é um plugin Fastify registrado com prefix em `src/server.ts`. O padrão de cada rota:

```typescript
// 1. Proteger com hook
app.addHook('onRequest', authenticate)          // usuário de clínica
// ou
{ onRequest: [authenticateSuperAdmin] }          // superadmin

// 2. Validar input com Zod
const data = schema.parse(req.body)

// 3. Sempre filtrar por tenantId
const result = await app.prisma.patient.findMany({
  where: { tenantId: tenantId(req), ... }
})
```

`app.prisma` é decorado pelo plugin `src/plugins/prisma.ts` (fastify-plugin).

### Frontend — Next.js 14 App Router

Grupos de rotas:

| Grupo | URL base | Descrição |
|-------|----------|-----------|
| `(auth)` | `/login`, `/register` | Páginas públicas da clínica |
| `(dashboard)` | `/dashboard`, `/patients`, etc. | Painel da clínica (requer `accessToken` cookie) |
| `(superadmin)` | `/superadmin`, `/superadmin/login` | Painel da plataforma (requer `sa_accessToken` cookie) |

**Dois clientes Axios separados:**
- `src/lib/api.ts` → `api` — usa cookies `accessToken` / `refreshToken`
- `src/lib/superadmin-api.ts` → `saApi` — usa cookies `sa_accessToken` / `sa_refreshToken`

Ambos têm interceptors de refresh token automático e **não tentam refresh no endpoint `/auth/login`** (evita loop de 401).

Auth helpers de cliente:
- `src/lib/auth.ts` — `setAuth`, `clearAuth`, `getUser`, `getTenant` (para usuários de clínica)
- `src/lib/superadmin-api.ts` — `setSuperAdminAuth`, `clearSuperAdminAuth`, `getSuperAdmin`

### Background job

`src/jobs/vaccineReminder.ts` — cron diário às 8h que envia email (nodemailer/SMTP) para tutores cujos animais têm vacina com `nextDoseAt` em 7 dias e `reminderSent = false`. Só roda fora de `NODE_ENV=test`.

## Variáveis de ambiente

`apps/api/.env` (não commitado):

```
DATABASE_URL=postgresql://vetcare:vetcare123@localhost:5432/vetcare
JWT_SECRET=...
PORT=3001
CORS_ORIGIN=http://localhost:3000
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS   # para lembretes de vacina
```

`apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Credenciais de demo (seed)

| Tipo | Slug | Email | Senha |
|------|------|-------|-------|
| SuperAdmin (plataforma) | — | `super@vetcare.com.br` | `Super@123` |
| Owner da clínica demo | `demo-clinic` | `admin@vetcare.com.br` | `Admin@123` |

> O login da clínica agora requer **slug + email + senha**. O mesmo email pode existir em múltiplas
> clínicas; o slug identifica em qual clínica o usuário está entrando.
