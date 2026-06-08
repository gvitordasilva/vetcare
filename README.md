# VetCare — Sistema de Gestão de Clínicas Veterinárias

Sistema multitenant completo, moderno e seguro para clínicas veterinárias brasileiras.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | Node.js + Fastify + Prisma |
| Banco | PostgreSQL |
| Auth | JWT (access 15min) + Refresh Token (30d) + bcrypt |
| Jobs | node-cron (lembretes de vacina) |
| Email | Nodemailer (SMTP) |

## Módulos

- **Auth** — Cadastro de clínica, login, refresh token, roles (OWNER/ADMIN/VET/RECEPTIONIST)
- **Dashboard** — KPIs, agenda do dia, receita dos últimos 6 meses
- **Pacientes** — Prontuário completo com histórico de consultas e vacinas
- **Tutores** — Cadastro com múltiplos animais vinculados
- **Agenda** — Agendamentos por dia/semana com controle de status
- **Consultas** — Ficha clínica, prescrições, exames
- **Vacinas** — Carteira de vacinação + lembrete automático 7 dias antes
- **Financeiro** — Cobranças, itens, desconto, registro de pagamento
- **Configurações** — Dados da clínica e gestão de usuários

## Segurança

- **Multi-tenancy** via `tenantId` em todas as queries — dados de uma clínica nunca vazam para outra
- **JWT de curta duração** (15min) com refresh token rotativo
- **bcrypt** com 12 rounds para senhas
- **Rate limiting** 100 req/min por IP
- **Helmet** (HTTP security headers)
- **CORS** restrito ao domínio frontend
- **Zod** para validação de todos os inputs
- **Soft delete** para pacientes (nunca perde histórico)

## Início rápido

### Pré-requisitos
- Node.js 20+
- PostgreSQL 16+ (ou Docker)

### 1. Clonar e instalar dependências
```bash
cd vetcare
npm install
```

### 2. Configurar variáveis de ambiente
```bash
# API
cp apps/api/.env.example apps/api/.env
# Edite DATABASE_URL e JWT_SECRET

# Web
cp apps/web/.env.local.example apps/web/.env.local
```

### 3. Banco de dados
```bash
# Subir PostgreSQL com Docker (opcional)
docker compose up db -d

# Criar tabelas e seed
npm run db:migrate
npm run db:seed
```

### 4. Rodar em desenvolvimento
```bash
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001

### Login de demonstração
- **Email:** admin@vetcare.com.br
- **Senha:** Admin@123

## Produção (Docker)

```bash
# Copiar e editar .env
cp .env.example .env

docker compose up -d
```

## Estrutura do projeto

```
vetcare/
├── apps/
│   ├── api/                  # Fastify API
│   │   ├── prisma/           # Schema + migrations + seed
│   │   └── src/
│   │       ├── jobs/         # Cron jobs (vaccine reminders)
│   │       ├── middleware/   # Auth guards
│   │       ├── plugins/      # Fastify plugins (prisma)
│   │       └── routes/       # Endpoints por módulo
│   └── web/                  # Next.js 14 App Router
│       └── src/
│           ├── app/          # Páginas (auth + dashboard)
│           ├── components/   # Dialogs e componentes
│           └── lib/          # API client, utils, auth helpers
└── packages/
    └── shared/               # Tipos TypeScript compartilhados
```

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/auth/register | Cadastrar clínica |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Renovar token |
| GET | /api/dashboard | KPIs e agenda |
| GET/POST | /api/patients | Listar/criar pacientes |
| GET/PUT | /api/patients/:id | Detalhe/atualizar |
| GET/POST | /api/owners | Tutores |
| GET/POST | /api/appointments | Agendamentos |
| PATCH | /api/appointments/:id/status | Mudar status |
| GET/POST | /api/consultations | Consultas |
| GET/POST | /api/vaccines | Vacinas |
| GET/POST | /api/invoices | Cobranças |
| PATCH | /api/invoices/:id/pay | Registrar pagamento |
| GET/PUT | /api/tenant | Dados da clínica |
| GET/POST | /api/tenant/users | Gestão de usuários |
