# VetCare — Documentação de Negócio

> **Versão:** 1.0 · **Data:** Junho 2026  
> **Classificação:** Documento interno · Produto & Engenharia

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Modelo de Negócio e Planos](#2-modelo-de-negócio-e-planos)
3. [Perfis de Usuário e Permissões](#3-perfis-de-usuário-e-permissões)
4. [Módulos do Sistema — Painel da Clínica](#4-módulos-do-sistema--painel-da-clínica)
   - 4.1 Dashboard
   - 4.2 Agenda
   - 4.3 Pacientes
   - 4.4 Tutores
   - 4.5 Vacinas
   - 4.6 Prontuário Clínico (Consultas)
   - 4.7 Internação Hospitalar
   - 4.8 Banho & Tosa
   - 4.9 Financeiro (Cobranças)
   - 4.10 Produtos & Serviços (Estoque)
   - 4.11 Relatórios Financeiros
   - 4.12 Comissões de Veterinários
   - 4.13 Notas Fiscais (NF-e / NFS-e)
   - 4.14 Telemedicina
   - 4.15 AI Scribe
   - 4.16 Configurações da Clínica
5. [Portal do Tutor](#5-portal-do-tutor)
6. [Painel SuperAdmin (Plataforma)](#6-painel-superadmin-plataforma)
7. [Notificações e Automações](#7-notificações-e-automações)
8. [Segurança e Conformidade](#8-segurança-e-conformidade)
9. [Integrações com Serviços Externos](#9-integrações-com-serviços-externos)
10. [Glossário](#10-glossário)

---

## 1. Visão Geral

O **VetCare** é um sistema SaaS *(Software as a Service)* multitenant de gestão para clínicas veterinárias. Ele centraliza toda a operação de uma clínica em uma única plataforma web acessível de qualquer dispositivo — computador, tablet ou smartphone.

### Proposta de valor

| Para a clínica | Para o tutor |
|---|---|
| Elimina papel e planilhas | Acesso ao histórico do pet 24/7 |
| Agenda inteligente sem conflitos | Agendamento online sem ligar |
| Prontuário clínico completo | Recebimento de lembretes automáticos |
| Financeiro e estoque integrados | Cobranças e prescrições digitais |
| Relatórios para tomada de decisão | Teleconsulta por vídeo |
| Emissão de nota fiscal integrada | Interface limpa e simples |

### Arquitetura de alto nível

```
┌─────────────────────────────────────────────────────────┐
│                   VetCare Platform                       │
│  ┌─────────────┐   ┌─────────────┐   ┌───────────────┐  │
│  │  Dashboard  │   │ Portal do   │   │  SuperAdmin   │  │
│  │  da Clínica │   │   Tutor     │   │  (Plataforma) │  │
│  └─────────────┘   └─────────────┘   └───────────────┘  │
│          ↕                 ↕                  ↕          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              API REST (Fastify)                   │   │
│  └──────────────────────────────────────────────────┘   │
│          ↕                 ↕                  ↕          │
│  ┌──────────┐   ┌─────────────────┐   ┌────────────┐   │
│  │PostgreSQL│   │ Serviços Externos│   │  Cron Jobs │   │
│  └──────────┘   └─────────────────┘   └────────────┘   │
└─────────────────────────────────────────────────────────┘
```

Cada clínica é um **tenant** completamente isolado. Os dados de uma clínica nunca são visíveis para outra. O isolamento é garantido em nível de aplicação — toda consulta ao banco é filtrada pelo identificador único da clínica.

---

## 2. Modelo de Negócio e Planos

O VetCare opera em modelo de assinatura mensal (SaaS) com três planos:

| Plano | Público-alvo | Características |
|---|---|---|
| **FREE** | Clínicas pequenas / teste | Funcionalidades essenciais com limites de uso |
| **PRO** | Clínicas de médio porte | Todas as funcionalidades, sem limites de uso |
| **ENTERPRISE** | Hospitais e redes | Multi-unidade, API dedicada, suporte prioritário |

O controle de limites por plano (ex: máximo de usuários, pacientes, armazenamento) é gerenciado pela plataforma via SuperAdmin e aplicado transparentemente no backend.

---

## 3. Perfis de Usuário e Permissões

O sistema possui dois contextos de autenticação completamente independentes:

### 3.1 Usuários da Clínica (Staff)

Cada usuário pertence a exatamente uma clínica. O login requer o **slug da clínica** (identificador único), e-mail e senha — garantindo que o mesmo e-mail possa existir em clínicas diferentes sem conflito.

| Perfil | Descrição | Permissões |
|---|---|---|
| **OWNER** | Proprietário da clínica | Acesso total. Único que pode ver dados financeiros completos e gerenciar usuários |
| **ADMIN** | Administrador | Quase tudo, exceto ações destrutivas irreversíveis |
| **VET** | Médico(a) Veterinário(a) | Prontuários, consultas, vacinas, internação. Sem acesso ao financeiro |
| **RECEPTIONIST** | Recepcionista | Agenda, tutores, pacientes, emissão de cobranças. Sem prontuário clínico |

**Regras de acesso importantes:**
- Nenhum usuário consegue ver dados de outra clínica, independente do perfil
- Prontuários clínicos (consultas, vacinas) **nunca são deletados** permanentemente — apenas arquivados (soft delete)
- Ações destrutivas (arquivar tutores, excluir vacinas) exigem perfil OWNER ou ADMIN

### 3.2 Tutores — Portal Externo

O tutor (dono do pet) acessa um portal separado com autenticação própria. O acesso é ativado pela clínica mediante fornecimento de senha ao tutor. O tutor:
- **Pode ver:** histórico de consultas, vacinas, prescrições, exames e cobranças dos seus pets
- **Pode fazer:** agendar consultas online, cancelar agendamentos, acompanhar cobranças em aberto
- **Não pode:** ver dados de outros tutores ou modificar o prontuário clínico

### 3.3 SuperAdmin (Plataforma)

Equipe interna do VetCare. Acessa o painel de plataforma via `/superadmin` com autenticação separada. Gerencia tenants, planos e monitora a saúde geral do SaaS.

---

## 4. Módulos do Sistema — Painel da Clínica

### 4.1 Dashboard

**Página inicial** após o login. Apresenta uma visão executiva da operação do dia e do mês:

- **Agendamentos do dia:** lista de consultas de hoje com horário, paciente, tutor e veterinário responsável
- **Indicadores do mês:** total de atendimentos, novos pacientes cadastrados, receita do mês, vacinas aplicadas
- **Gráfico de receita:** evolução dos últimos 6 meses em formato de barras
- **Atalhos rápidos:** acesso direto para criar agendamento, cadastrar paciente, registrar vacina ou emitir cobrança

O dashboard é atualizado em tempo real e todos os números filtram automaticamente pelo tenant da clínica logada.

---

### 4.2 Agenda

Central de gerenciamento de consultas e procedimentos.

#### Funcionalidades

**Criação de agendamento**
- Campos: paciente, veterinário, data/hora, duração (15 a 240 min), tipo e observações
- **Detecção automática de conflitos:** o sistema verifica em banco (via SQL nativo) se o veterinário ou o paciente já possuem agendamento no mesmo período. Dois agendamentos sobrepostos são impossíveis
- Tipos disponíveis: Consulta, Retorno, Vacinação, Cirurgia, Exame, Banho e Tosa, Emergência

**Máquina de estados do agendamento**
O agendamento segue um fluxo linear de estados que reflete a jornada real de atendimento:

```
SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED (terminal)
     ↓             ↓           ↓
  CANCELLED     CANCELLED   CANCELLED (terminal)
     ↓
  NO_SHOW (terminal)
```

Transições inválidas (ex: ir de COMPLETED para IN_PROGRESS) são bloqueadas com mensagem de erro e lista das transições permitidas.

**Lembrete automático 24h antes**
O sistema envia automaticamente um lembrete ao tutor por e-mail (e WhatsApp, se configurado) 24 horas antes da consulta agendada. O lembrete inclui nome do pet, tipo de consulta, data, hora e veterinário. Cada agendamento recebe no máximo um lembrete (idempotência garantida pelo campo `reminderSent`).

**Filtros de visualização**
- Por data específica
- Por veterinário
- Por status (agendado, confirmado, em andamento, etc.)
- Paginação configurável (máx. 100 por página)

---

### 4.3 Pacientes

Cadastro e prontuário de cada animal atendido pela clínica.

#### Dados cadastrais

| Campo | Descrição |
|---|---|
| Nome | Nome do animal |
| Espécie | Cão, gato, ave, coelho, hamster, réptil, outro |
| Raça | Raça ou cruzamento |
| Gênero | Macho / Fêmea |
| Data de nascimento | Para cálculo automático de idade |
| **Castrado/Esterilizado** | Flag clínica importante para decisões terapêuticas |
| **Alergias** | Campo destacado para substâncias e medicamentos — crítico para segurança clínica |
| Peso | Cache do peso mais recente (histórico completo em WeightRecord) |
| Microchip | Código do microchip de identificação |
| Foto | URL da foto do animal |
| Notas | Observações gerais |

#### Histórico de peso

Cada pesagem é registrada como um **WeightRecord** imutável, vinculado opcionalmente a uma consulta. Isso garante que o histórico de peso nunca seja perdido mesmo que o paciente seja atualizado. O campo `peso` no cadastro do paciente é apenas um cache do valor mais recente para exibição rápida.

A API expõe `GET /api/patients/:id/weight-history` retornando todos os registros em ordem cronológica com quem pesou e a qual consulta está vinculado.

#### Soft delete de pacientes

Pacientes não são deletados permanentemente. O arquivamento (`active: false`) impede que o paciente apareça em listagens, mas mantém todo o histórico intacto. Um tutor só pode ser arquivado se não tiver pacientes ativos vinculados.

---

### 4.4 Tutores

Cadastro dos responsáveis pelos animais.

#### Dados cadastrais

- Nome, e-mail, telefone principal e secundário, CPF, endereço completo, cidade, notas

#### Validação de CPF

O sistema valida o CPF com o **algoritmo oficial de dígito verificador da Receita Federal**:
- Remove formatação automaticamente (aceita `529.982.247-25` ou `52998224725`)
- Rejeita sequências uniformes como `111.111.111-11`
- Valida os dois dígitos verificadores
- Armazena sempre em formato normalizado (11 dígitos sem pontuação)
- Garante unicidade de CPF por clínica (um CPF não pode ser cadastrado duas vezes na mesma clínica)

#### Busca

A listagem suporta busca por nome, e-mail, telefone e CPF com correspondência parcial insensível a maiúsculas.

#### Soft delete com proteção

Ao arquivar um tutor, o sistema verifica se existem **pacientes ativos** vinculados. Se houver, o arquivamento é bloqueado com mensagem indicando a quantidade de pacientes que precisam ser arquivados primeiro. Isso evita deixar pacientes órfãos no sistema.

#### Portal do Tutor — Ativação

O staff pode ativar o acesso ao Portal do Tutor para qualquer tutor que possua e-mail cadastrado. A clínica define uma senha inicial que é fornecida ao tutor.

---

### 4.5 Vacinas

Controle de vacinação com histórico completo e lembretes automáticos.

#### Registro de vacina

Cada aplicação registra: nome da vacina, fabricante, número de lote, dose, data de aplicação, veterinário responsável, data da próxima dose e observações.

#### Soft delete médico

Vacinas são registros médicos e **nunca são deletadas permanentemente**. A opção de "arquivar" uma vacina (ex: lançamento incorreto) marca o registro como inativo (`active: false`) mas preserva o histórico. Apenas OWNER e ADMIN podem arquivar vacinas.

#### Lembrete automático de revacinação

Um job diário (roda às 8h) verifica vacinas com `nextDoseAt` em **exatamente 7 dias** que ainda não tiveram lembrete enviado. O e-mail é enviado ao tutor com dados da vacina, nome do pet e contato da clínica. O campo `reminderSent` evita lembretes duplicados.

#### Filtro "Vacinas a vencer"

A listagem suporta filtro `dueSoon=true` que retorna apenas vacinas com próxima dose nos próximos 30 dias — útil para a recepção fazer ligações proativas.

---

### 4.6 Prontuário Clínico (Consultas)

O prontuário segue o padrão **SOAP** (Subjetivo, Objetivo, Avaliação, Plano), referência internacional em medicina veterinária.

#### Campos do prontuário

| Campo | SOAP | Descrição |
|---|---|---|
| Anamnese | S | Queixa principal e histórico relatado pelo tutor |
| Exame Físico | O | Achados objetivos do exame |
| Diagnóstico | A | Diagnóstico ou suspeita diagnóstica |
| Tratamento | P | Plano terapêutico |
| Peso | O | Pesagem do dia (cria WeightRecord automaticamente) |
| Temperatura | O | Em graus Celsius |
| Frequência Cardíaca | O | Em bpm |
| Frequência Respiratória | O | Em mpm |
| Retorno | P | Data de retorno recomendada |

#### Prescrições

Cada consulta pode ter múltiplas prescrições com: medicamento, dose, frequência, duração e instruções especiais.

#### Geração de PDF de Prescrição

O sistema gera um **PDF profissional** da prescrição com:
- Cabeçalho colorido com dados da clínica
- Identificação completa do paciente, tutor e veterinário
- Lista de medicamentos com posologia
- Área de assinatura do veterinário
- **QR code de verificação** que permite confirmar a autenticidade
- **Código único de 8 caracteres** (hash SHA-256) para verificação manual
- Marca d'água diagonal "PRESCRIÇÃO VETERINÁRIA"

O documento segue a **Resolução CFMV nº 1.015/2012** e é válido para receituários veterinários simples.

#### Solicitação de Exames

Cada consulta pode registrar solicitações de exame com: tipo, laboratório e observações. Quando o resultado chegar, o staff faz o upload do arquivo (PDF ou imagem) que é vinculado ao exame e fica acessível pelo portal do tutor.

#### Upload de Resultado de Exame

`POST /api/consultations/:id/exams/:examId/result` aceita upload de arquivo (até 10 MB) e atualiza o status do exame para DONE automaticamente.

#### AI Scribe — Geração Automática de SOAP

Recurso de IA que transcreve a consulta e preenche o prontuário automaticamente:
1. O veterinário grava o áudio da consulta
2. O sistema transcreve via **OpenAI Whisper** (melhor ASR para português)
3. A transcrição é enviada ao **Claude Sonnet** com prompt veterinário especializado
4. Os campos do prontuário são preenchidos automaticamente
5. O veterinário revisa e salva

Também disponível em modo texto: o vet digita notas corridas e a IA estrutura em SOAP. Médicos veterinários gastam em média 40% do tempo em documentação — o AI Scribe elimina a maior parte dessa carga.

#### Validações de integridade

- Consulta vinculada a agendamento CANCELADO ou NO_SHOW é bloqueada
- Ao criar uma consulta vinculada a um agendamento, o agendamento é automaticamente marcado como COMPLETED
- Prontuários nunca são deletados (hard delete bloqueado na camada de negócio)

---

### 4.7 Internação Hospitalar

Módulo para clínicas e hospitais que realizam internações, cirurgias e atendimentos de emergência.

#### Whiteboard de Internação

Painel visual em tempo real mostrando todos os animais internados no momento, com atualização automática a cada 60 segundos. Cada card exibe:

- Foto/emoji do animal, nome, espécie
- **Nível de severidade** com indicação visual colorida:
  - 🟢 **BAIXA** — verde
  - 🟡 **MÉDIA** — âmbar
  - 🟠 **ALTA** — laranja
  - 🔴 **CRÍTICA** — vermelho pulsante (animação)
- Box/alojamento em que o animal está
- **Alergias em destaque** (fundo vermelho para não passar despercebido)
- Última evolução clínica com sinais vitais
- Medicações ativas em curso
- Tempo internado e veterinário responsável

#### Estados de Internação

```
ADMITTED → OBSERVATION
    ↕           ↕
DISCHARGED ← TRANSFERRED (terminais)
```

#### Evolução Clínica

Cada evolução registra: veterinário, data/hora, peso, temperatura, frequência cardíaca, frequência respiratória e descrição clínica livre. Gera histórico completo da internação.

#### Prescrições de Internação

Separadas das prescrições de consulta, modeladas para o contexto hospitalar:
- Medicamento, dose, frequência, via de administração (IV, IM, VO, SC), período de vigência
- **Registro de cada aplicação:** quem aplicou, quando, observações
- Ideal para folha de controle de enfermagem

#### Proteção contra duplicidade

O sistema impede a criação de uma nova internação para um paciente que já está internado (status ADMITTED ou OBSERVATION).

---

### 4.8 Banho & Tosa

Módulo de gestão de serviços estéticos com controle de pacotes pré-pagos.

#### Pacotes de Sessões

O tutor pode comprar um pacote de N sessões com preço fixo (ex: "Pacote 5 Banhos por R$ 150"). O sistema controla:
- Sessões totais e utilizadas
- **Barra de progresso visual** (verde → âmbar → vermelho conforme esgota)
- Data de validade (pacote vence se não usado até a data)
- Data de pagamento

#### Uso de Sessão

Ao realizar o serviço, basta clicar "Usar 1 Sessão". O sistema valida:
- Pacote está ativo
- Não está vencido
- Tem sessões disponíveis

Ao esgotar todas as sessões, o pacote é automaticamente desativado.

#### Integração com Agenda

O tipo de agendamento "GROOMING" já existe no sistema de agenda, permitindo vincular pacotes de banho/tosa com os horários agendados.

---

### 4.9 Financeiro (Cobranças)

Controle financeiro integrado ao prontuário e ao estoque.

#### Emissão de Cobrança

Uma cobrança (invoice) pode ser criada manualmente ou vinculada a um agendamento. Campos:
- Tutor e paciente (opcionais)
- Agendamento vinculado (opcional)
- Itens: descrição, quantidade, preço unitário, produto do catálogo (opcional)
- Desconto
- Data de vencimento
- Observações

#### Numeração Atômica

O número da cobrança (ex: `000042`) é gerado de forma **atômica e à prova de race conditions**: o sistema usa `SELECT ... FOR UPDATE` no registro do tenant dentro de uma transação Prisma, garantindo que nunca haverá dois documentos com o mesmo número em uma clínica, mesmo com requisições simultâneas.

#### Integração com Estoque

Quando um item da cobrança é vinculado a um produto do catálogo (`productId`), o sistema:
1. Valida que o produto existe e está ativo nessa clínica
2. Verifica se o estoque é suficiente
3. Decrementa o estoque **atomicamente** dentro da mesma transação de criação da cobrança

Se o estoque for insuficiente, a cobrança é rejeitada com mensagem explicativa antes mesmo de entrar na transação.

#### Ciclo de vida dos pagamentos

```
PENDING → PAID (via PATCH /invoices/:id/pay)
   ↓
OVERDUE (automático, se dueDate < hoje)
   ↓
CANCELLED
```

#### Marcação automática de inadimplência

Um job diário (meia-noite) varre todas as cobranças com `status = PENDING` e `dueDate < hoje` e as marca como `OVERDUE`. Isso alimenta os relatórios de inadimplência em tempo real.

#### Métodos de pagamento

Dinheiro, Cartão de Crédito, Cartão de Débito, PIX, Transferência Bancária.

#### Emissão de Nota Fiscal

A partir de qualquer cobrança **paga**, é possível emitir NF-e (produtos) ou NFS-e (serviços veterinários). Ver seção 4.13.

---

### 4.10 Produtos & Serviços (Estoque)

Catálogo de produtos e serviços da clínica com controle de estoque.

#### Cadastro

- Nome, descrição, categoria, preço de venda, custo (para margem), estoque, unidade de medida

#### Controle de Estoque

O estoque é decrementado automaticamente ao emitir cobranças com produto vinculado. A API rejeita cobranças quando o estoque é insuficiente (validação antes da transação). A listagem padrão filtra apenas produtos ativos (`active: true`).

#### Uso em Cobranças

Produtos do catálogo podem ser selecionados ao criar uma cobrança. O sistema usa o preço configurado como padrão, mas o operador pode ajustar o preço unitário no momento da venda.

---

### 4.11 Relatórios Financeiros

Visão analítica da saúde financeira da clínica.

#### Relatório Anual (`/api/reports/financial`)

| Indicador | Descrição |
|---|---|
| Receita Total | Soma de todas as cobranças pagas no período |
| Ticket Médio | Receita ÷ número de cobranças pagas |
| Taxa de Inadimplência | Total OVERDUE ÷ total emitido × 100 |
| Breakdown mensal | Todos os indicadores mês a mês |

**Visualizações:**
- Gráfico de barras: receita e inadimplência por mês
- Gráfico de linha: evolução do ticket médio
- Gráfico de pizza: receita por tipo de serviço
- Cards: receita anual por método de pagamento
- Ranking: top 10 pacientes por receita (últimos 12 meses)

#### Receita por Tipo de Serviço (`/api/reports/services`)

Cruza dados de invoices com o tipo do agendamento vinculado (Consulta, Cirurgia, Vacinação, etc.). Cobranças sem agendamento aparecem como "Avulso".

#### Navegação por período

O usuário pode navegar entre anos com setas ← → no próprio relatório.

---

### 4.12 Comissões de Veterinários

Sistema de cálculo e acompanhamento de comissões para clínicas que remuneram vets por produção.

#### Configuração

Cada veterinário pode ter uma `commissionRate` (percentual de 0 a 100) configurada individualmente. A taxa é editada inline na tabela de comissões — sem necessidade de modal.

#### Cálculo de Comissão

A comissão é calculada sobre a **receita gerada pelo veterinário**: soma das cobranças pagas das consultas que o vet realizou no período selecionado.

```
Comissão = Receita do Vet × Taxa de Comissão / 100
```

#### Relatórios de Comissão

- **Por mês:** produção e comissão de todos os vets em um mês específico
- **Histórico anual:** breakdown mensal de um vet específico
- **Totais:** receita total e total de comissões a pagar no período

---

### 4.13 Notas Fiscais (NF-e / NFS-e)

Emissão eletrônica de notas fiscais integrada ao financeiro da clínica.

#### Tipos suportados

| Tipo | Quando usar |
|---|---|
| **NFS-e** | Nota Fiscal de Serviço — para consultas, exames, cirurgias |
| **NF-e** | Nota Fiscal de Produto — para venda de medicamentos, ração, acessórios |

#### Provedor: Nuvem Fiscal

A integração é feita via **Nuvem Fiscal** (nuvemfiscal.com.br), que abstrai a comunicação com a SEFAZ, geração de XML e ambiente de sandbox/homologação.

#### Fluxo de emissão

1. O operador acessa uma cobrança **paga** no financeiro
2. Clica em "Emitir Nota Fiscal" e seleciona o tipo (NFS-e recomendada para serviços veterinários)
3. O sistema valida pré-requisitos (CNPJ da clínica configurado, cobrança paga, sem nota duplicada)
4. A emissão é iniciada de forma assíncrona — o operador recebe confirmação imediata e a nota é emitida em background
5. Na página de Notas Fiscais, o status é consultado automaticamente (atualização a cada 15s)
6. Quando autorizada pela SEFAZ, links para PDF e XML ficam disponíveis

#### Status de um documento fiscal

```
PENDING → PROCESSING → AUTHORIZED (links PDF/XML disponíveis)
                  ↓
              REJECTED (mensagem de erro da SEFAZ)
AUTHORIZED → CANCELLED (cancelamento em até 24h)
```

#### Pré-requisitos de configuração

- CNPJ da clínica em Configurações → Dados Fiscais
- Inscrição Municipal (para NFS-e) ou Estadual (para NF-e)
- Variáveis de ambiente `NUVEM_FISCAL_CLIENT_ID` e `NUVEM_FISCAL_CLIENT_SECRET`
- Ambiente sandbox disponível para testes sem custo

---

### 4.14 Telemedicina

Teleconsultas veterinárias por vídeo integradas à agenda e ao portal do tutor.

#### Provedor: Daily.co

O sistema usa a plataforma **Daily.co** para salas de vídeo. Cada sala é criada via API REST, tem duração limitada (expira 4h após o horário da consulta) e suporta até 5 participantes.

#### Fluxo do staff

1. Cria uma teleconsulta a partir de um agendamento existente
2. O sistema cria a sala no Daily.co e armazena a URL
3. No horário da consulta, clica em "Entrar na Sala" — o sistema gera um token seguro de participante e abre o vídeo em nova aba
4. Ao finalizar, clica em "Encerrar" — a sala é deletada do Daily.co e a sessão é registrada com duração

#### Fluxo do tutor

O tutor acessa o Portal do Tutor, visualiza a teleconsulta agendada e recebe um link para entrar na sala no horário marcado.

#### Modo demonstração

Se `DAILY_API_KEY` não estiver configurado, o sistema funciona em modo de demonstração — cria registros no banco com URLs simuladas, sem erros. Útil para desenvolvimento e testes.

#### Histórico

Todas as sessões ficam registradas com duração, veterinário, paciente e notas pós-consulta.

---

### 4.15 AI Scribe

Inteligência artificial para documentação automática de consultas.

#### Problema resolvido

Médicos veterinários gastam em média **40% do tempo de trabalho** em documentação. O AI Scribe reduz drasticamente esse tempo ao transcrever e estruturar automaticamente as notas clínicas.

#### Como funciona

**Modo áudio (principal):**
1. O veterinário pressiona gravar antes da consulta
2. O sistema captura áudio da conversa com o tutor e das observações clínicas
3. O áudio é enviado ao backend ao final da consulta
4. **OpenAI Whisper** transcreve o áudio em português
5. **Claude Sonnet** analisa a transcrição com um prompt especializado em veterinária
6. Os campos do prontuário são preenchidos automaticamente: anamnese, exame físico, diagnóstico, tratamento, prescrições, exames solicitados, sinais vitais, data de retorno
7. O veterinário revisa, ajusta se necessário, e salva

**Modo texto:**
O veterinário pode digitar notas corridas em linguagem natural (sem precisar usar o formulário estruturado) e o sistema estrutura em SOAP automaticamente.

#### Formatos de áudio aceitos

MP3, WAV, M4A, WEBM, OGG — até 25 MB por arquivo.

#### Degradação graceful

- Sem `OPENAI_API_KEY`: endpoint retorna 503 com mensagem clara
- Sem `ANTHROPIC_API_KEY`: retorna transcrição bruta sem estruturação
- O veterinário sempre pode completar o prontuário manualmente

---

### 4.16 Configurações da Clínica

Gerenciamento dos dados e usuários da clínica.

#### Dados da Clínica

- Nome, e-mail, telefone, endereço, cidade, estado, CEP, logotipo
- **Dados Fiscais:** CNPJ, Inscrição Estadual, Inscrição Municipal, Regime Tributário (MEI, Simples Nacional, Lucro Presumido, Lucro Real)

#### Gerenciamento de Usuários

Apenas OWNER pode criar e gerenciar usuários. Funcionalidades:
- Criar usuário com nome, e-mail, senha e perfil
- Ativar/desativar usuário sem deletar seu histórico
- Alterar perfil de acesso

---

## 5. Portal do Tutor

Área separada e exclusiva para tutores, acessível em `/portal`. Tem identidade visual própria e é completamente independente do painel da clínica.

### 5.1 Acesso

O acesso é ativado **pela clínica** a partir do cadastro do tutor. O tutor recebe e-mail e senha inicial da própria clínica. O login usa os mesmos dados de slug da clínica + e-mail + senha.

JWT com `role: TUTOR` — token separado do staff para garantir que tutores nunca acessem funcionalidades administrativas, mesmo que obtenham um token.

### 5.2 Meus Pets

Lista todos os animais do tutor com:
- Foto, nome, espécie, raça, idade calculada, peso atual
- Indicação se é castrado/esterilizado
- **Alergias em destaque** (fundo vermelho)
- Data da próxima vacina (quando houver)
- Próxima consulta agendada

Ao expandir um pet, o tutor visualiza:
- **Histórico de vacinas:** nome, data, lote, próxima dose (com indicação visual de "atrasada")
- **Últimas 5 consultas:** diagnóstico, tratamento, medicamentos prescritos, exames solicitados
- **Link "Ver resultado"** para cada exame com resultado disponível
- **Gráfico de histórico de peso** (últimas 8 pesagens)

### 5.3 Agendar Consulta (Onda 4.3)

Wizard em 5 passos intuitivos:

1. **Selecionar pet** — lista os pets do tutor
2. **Selecionar tipo e veterinário** — vets disponíveis na clínica
3. **Selecionar data** — próximos 14 dias úteis (sem domingo)
4. **Selecionar horário** — sistema calcula slots livres de 30 min (8h–18h), excluindo os já ocupados
5. **Confirmar** — resumo + campo de observações + botão de confirmação

O sistema usa a mesma lógica de detecção de conflitos do painel da clínica, garantindo que o tutor nunca consiga agendar em horário já ocupado.

O tutor também pode cancelar consultas com status SCHEDULED diretamente pelo portal.

### 5.4 Cobranças

Lista todas as cobranças do tutor com destaque para as pendentes e vencidas:
- Total em aberto exibido no topo quando há cobranças abertas
- Detalhe completo de cada cobrança: itens, valores, descontos, método e data de pagamento

---

## 6. Painel SuperAdmin (Plataforma)

Acessível apenas pela equipe interna do VetCare em `/superadmin`. Autenticação completamente separada.

### Funcionalidades

**Gestão de Tenants**
- Listar todas as clínicas cadastradas na plataforma
- Ver detalhes de cada clínica: dados, plano, usuários, data de criação
- Ativar/desativar uma clínica
- Alterar o plano de uma clínica (FREE → PRO → ENTERPRISE)

**Criação de Clínica**
O SuperAdmin pode cadastrar novas clínicas diretamente pela plataforma, criando automaticamente o tenant e o primeiro usuário OWNER.

**Monitoramento**
Visão consolidada de todas as clínicas: total de tenants ativos, distribuição por plano, data de último acesso.

---

## 7. Notificações e Automações

O sistema executa três jobs automáticos que não requerem nenhuma ação manual:

### 7.1 Lembrete de Vacina

**Quando:** Diariamente às 8h  
**O que faz:** Envia e-mail (e WhatsApp se configurado) ao tutor para vacinas com `nextDoseAt` em exatamente 7 dias que ainda não tiveram lembrete enviado.  
**Canais:** E-mail + WhatsApp (Twilio)  
**Idempotência:** Campo `reminderSent` garante no máximo 1 lembrete por vacina

### 7.2 Lembrete de Consulta

**Quando:** A cada hora  
**O que faz:** Envia lembrete ao tutor para consultas agendadas nas próximas 23–25 horas com status SCHEDULED ou CONFIRMED.  
**Canais:** E-mail + WhatsApp (Twilio)  
**Janela de 2h:** Absorve imprecisões de horário de execução sem gerar duplicatas

### 7.3 Marcação de Inadimplência

**Quando:** Diariamente à meia-noite  
**O que faz:** Marca como `OVERDUE` todas as cobranças com `status = PENDING` e `dueDate < hoje`.  
**Impacto:** Alimenta os relatórios de inadimplência em tempo real sem necessidade de cálculo manual

---

## 8. Segurança e Conformidade

### Isolamento de Dados (Multitenant)

- Todo model no banco tem `tenantId`
- Toda query de negócio filtra por `tenantId` extraído do JWT
- `tenantId` **nunca é aceito** via body ou parâmetros de URL — apenas via JWT
- Impossível para um usuário autenticado acessar dados de outra clínica, mesmo manipulando requisições

### Autenticação

- Tokens JWT com expiração de **15 minutos** (access token)
- Refresh tokens com expiração de **30 dias**, rotacionados a cada uso (proteção contra roubo)
- Login requer slug + e-mail + senha — o slug previne que alguém teste e-mails em todas as clínicas
- Mensagem de erro genérica no login: "Clínica, email ou senha incorretos" — não revela qual dado está errado
- Logout invalida o refresh token no banco

### Controle de Acesso

- Autorização por papel (RBAC) implementada em cada rota sensível
- Dupla camada: `authenticate` verifica JWT, `authorize(roles...)` verifica o papel
- Perfis distintos para staff (`OWNER/ADMIN/VET/RECEPTIONIST`) e tutores (`TUTOR`) com tokens incompatíveis entre si

### Proteção contra Ataques

- **Rate limiting:** máximo de 100 requisições por minuto por IP
- **Helmet.js:** headers de segurança HTTP (XSS, clickjacking, etc.)
- **Validação de inputs:** Zod em todas as rotas — nenhum dado chega ao banco sem validação
- **pageSize limitado:** máximo de 100 itens por página em todas as listagens (evita queries abusivas)
- **Path traversal bloqueado** na rota de downloads de arquivos (`/api/uploads/:filename`)
- **Validação de CPF:** algoritmo completo com dígito verificador, não aceita sequências uniformes

### Integridade de Dados Médicos

- Prontuários, vacinas e registros de peso **nunca são deletados** (soft delete apenas)
- Hard delete completamente bloqueado para dados médicos
- Histórico de peso preservado como `WeightRecord` imutável — não sobrescrito

### Conformidade

- **Prescrições:** geradas conforme Resolução CFMV nº 1.015/2012
- **NF-e / NFS-e:** emitidas via provedor homologado pela SEFAZ
- **LGPD:** tutores podem ter acesso aos seus dados arquivados pelo portal

---

## 9. Integrações com Serviços Externos

| Serviço | Módulo | Obrigatório | Variáveis de Ambiente |
|---|---|---|---|
| **SMTP** (qualquer provedor) | E-mails (lembretes, alertas) | Não | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` |
| **Twilio WhatsApp** | Notificações WhatsApp | Não | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` |
| **Nuvem Fiscal** | NF-e / NFS-e | Não | `NUVEM_FISCAL_CLIENT_ID`, `NUVEM_FISCAL_CLIENT_SECRET`, `NUVEM_FISCAL_ENV` |
| **OpenAI Whisper** | AI Scribe (transcrição) | Não | `OPENAI_API_KEY` |
| **Anthropic Claude** | AI Scribe (estruturação SOAP) | Não | `ANTHROPIC_API_KEY` |
| **Daily.co** | Telemedicina | Não | `DAILY_API_KEY` |
| **Storage** | Upload de exames | Não | `UPLOAD_DIR` (padrão: `./uploads`) |

Nenhuma integração é obrigatória para o funcionamento core do sistema. Cada módulo verifica a disponibilidade da integração e retorna mensagens claras quando não configurada.

---

## 10. Glossário

| Termo | Definição |
|---|---|
| **Tenant** | Uma clínica veterinária no sistema. Cada tenant tem seus dados completamente isolados |
| **Slug** | Identificador único e legível de uma clínica na URL (ex: `clinica-sao-pedro`) |
| **SOAP** | Método de registro clínico: Subjetivo, Objetivo, Avaliação, Plano |
| **Soft delete** | Arquivamento lógico — o registro fica inativo mas permanece no banco |
| **WeightRecord** | Registro histórico e imutável de uma pesagem de paciente |
| **Invoice** | Cobrança emitida para um tutor (pode ter múltiplos itens) |
| **FiscalDocument** | Nota fiscal eletrônica (NF-e ou NFS-e) vinculada a uma cobrança |
| **AI Scribe** | Recurso de IA que transcreve áudio e estrutura prontuário automaticamente |
| **JWT** | Token de autenticação com expiração curta (15 min) |
| **Refresh Token** | Token de longa duração (30 dias) para renovar JWTs expirados |
| **TUTOR** | Role do JWT exclusivo do Portal do Tutor — incompatível com o painel da clínica |
| **Race condition** | Situação de concorrência onde duas requisições simultâneas geram dados inconsistentes |
| **Whiteboard** | Painel visual de internação em tempo real |
| **NF-e** | Nota Fiscal Eletrônica de produto (requer IE) |
| **NFS-e** | Nota Fiscal de Serviço Eletrônica (requer IM) |
| **CRMV** | Conselho Regional de Medicina Veterinária — número de registro do veterinário |
| **CFMV** | Conselho Federal de Medicina Veterinária |

---

*Documento gerado em junho de 2026 · VetCare Platform*
