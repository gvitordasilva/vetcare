/**
 * Serviço de integração com Asaas — processador de pagamentos brasileiro.
 * Suporta PIX, boleto bancário e cartão de crédito em BRL.
 *
 * Documentação: https://docs.asaas.com
 */

const ASAAS_BASE_URL =
  process.env.ASAAS_ENV === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3'

async function asaasRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const apiKey = process.env.ASAAS_API_KEY
  if (!apiKey) throw new Error('ASAAS_API_KEY não configurada')

  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Asaas ${method} ${path} → ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ─── Tipos retornados pela API do Asaas ──────────────────────────

export interface AsaasCustomer {
  id: string
  name: string
  email?: string
  cpfCnpj?: string
  phone?: string
}

export interface AsaasSubscription {
  id: string
  customer: string         // customer id
  billingType: string      // BOLETO | PIX | CREDIT_CARD | UNDEFINED
  cycle: string            // MONTHLY | YEARLY
  value: number            // em reais (float)
  nextDueDate: string      // YYYY-MM-DD
  status: string           // ACTIVE | INACTIVE | EXPIRED
}

export interface AsaasCharge {
  id: string
  customer: string
  value: number
  netValue: number
  billingType: string
  status: string           // PENDING | RECEIVED | CONFIRMED | OVERDUE | REFUNDED | etc.
  dueDate: string
  invoiceUrl?: string
  bankSlipUrl?: string
  pixQrCodeId?: string
}

export interface AsaasPixQrCode {
  encodedImage: string     // base64 do QR code
  payload: string          // copia e cola
  expirationDate: string
}

export interface AsaasBoletoData {
  identificationField: string   // código de barras
  nossoNumero: string
  barCode: string
}

// ─── Clientes ────────────────────────────────────────────────────

export async function createCustomer(data: {
  name: string
  email?: string
  cpfCnpj?: string
  phone?: string
}): Promise<AsaasCustomer> {
  return asaasRequest<AsaasCustomer>('POST', '/customers', data)
}

export async function getCustomer(customerId: string): Promise<AsaasCustomer> {
  return asaasRequest<AsaasCustomer>('GET', `/customers/${customerId}`)
}

// ─── Assinaturas ─────────────────────────────────────────────────

export interface CreateSubscriptionInput {
  customer: string          // asaas customer id
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED'
  cycle: 'MONTHLY' | 'YEARLY'
  value: number             // em reais (float)
  nextDueDate: string       // YYYY-MM-DD
  description?: string
  externalReference?: string  // tenantId para rastreamento no webhook
}

export async function createAsaasSubscription(
  data: CreateSubscriptionInput,
): Promise<AsaasSubscription> {
  return asaasRequest<AsaasSubscription>('POST', '/subscriptions', data)
}

export async function cancelAsaasSubscription(
  subscriptionId: string,
): Promise<void> {
  await asaasRequest('DELETE', `/subscriptions/${subscriptionId}`)
}

export async function getSubscriptionPayments(
  subscriptionId: string,
): Promise<{ data: AsaasCharge[] }> {
  return asaasRequest<{ data: AsaasCharge[] }>(
    'GET',
    `/subscriptions/${subscriptionId}/payments`,
  )
}

// ─── Cobranças individuais ────────────────────────────────────────

export async function getCharge(chargeId: string): Promise<AsaasCharge> {
  return asaasRequest<AsaasCharge>('GET', `/payments/${chargeId}`)
}

export async function getPixQrCode(chargeId: string): Promise<AsaasPixQrCode> {
  return asaasRequest<AsaasPixQrCode>('GET', `/payments/${chargeId}/pixQrCode`)
}

export async function getBoletoData(chargeId: string): Promise<AsaasBoletoData> {
  return asaasRequest<AsaasBoletoData>(
    'GET',
    `/payments/${chargeId}/identificationField`,
  )
}

// ─── Helpers ────────────────────────────────────────────────────

/** Converte centavos para reais (float com 2 casas) */
export function centsToReais(cents: number): number {
  return Math.round(cents) / 100
}

/** Formata Date para YYYY-MM-DD esperado pelo Asaas */
export function toAsaasDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
