/**
 * Integração com Nuvem Fiscal (https://nuvemfiscal.com.br)
 *
 * Abstrai a emissão de NF-e (produtos) e NFS-e (serviços) para o mercado BR.
 * Cada tenant precisa ter CNPJ e dados fiscais configurados.
 *
 * Variáveis de ambiente:
 *   NUVEM_FISCAL_CLIENT_ID     – client_id da aplicação
 *   NUVEM_FISCAL_CLIENT_SECRET – client_secret da aplicação
 *   NUVEM_FISCAL_ENV           – "production" | "sandbox" (padrão: sandbox)
 */

const BASE_URL = process.env.NUVEM_FISCAL_ENV === 'production'
  ? 'https://api.nuvemfiscal.com.br'
  : 'https://api.sandbox.nuvemfiscal.com.br'

let _accessToken: string | null = null
let _tokenExpiry: number        = 0

async function getAccessToken(): Promise<string> {
  if (_accessToken && Date.now() < _tokenExpiry - 30_000) return _accessToken

  const res = await fetch(`${BASE_URL}/oauth/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     process.env.NUVEM_FISCAL_CLIENT_ID ?? '',
      client_secret: process.env.NUVEM_FISCAL_CLIENT_SECRET ?? '',
      scope:         'nfe nfse',
    }).toString(),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Nuvem Fiscal auth failed (${res.status}): ${body}`)
  }

  const data = await res.json()
  _accessToken  = data.access_token
  _tokenExpiry  = Date.now() + data.expires_in * 1000
  return _accessToken!
}

async function request(method: string, path: string, body?: object): Promise<any> {
  const token = await getAccessToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch { data = { raw: text } }

  if (!res.ok) throw Object.assign(new Error(`Nuvem Fiscal ${method} ${path} (${res.status})`), { status: res.status, body: data })
  return data
}

// ── Tipos ──────────────────────────────────────────────────────────

export interface NfeEmitPayload {
  cnpjEmitente:  string
  nomeEmitente:  string
  ieEmitente?:   string
  enderecoEmitente: {
    logradouro: string; numero: string; cidade: string; uf: string; cep: string
  }
  cpfDestinatario?:  string
  cnpjDestinatario?: string
  nomeDestinatario:  string
  emailDestinatario?: string
  itens: {
    descricao:   string
    quantidade:  number
    valorUnitario: number
    ncm?:        string  // Nomenclatura Comum do Mercosul
  }[]
  valorTotal:   number
  naturezaOperacao: string
}

export interface NfseEmitPayload {
  cnpjPrestador: string
  imPrestador?:  string
  nomePrestador: string
  cpfTomador?:   string
  cnpjTomador?:  string
  nomeTomador:   string
  emailTomador?: string
  descricaoServico: string
  valorServico:  number
  codigoTributacaoMunicipio?: string  // código CNAE ou LC116
  itemListaServico?: string           // código item da lista LC116
}

// ── NF-e (produtos) ────────────────────────────────────────────────

export async function emitirNfe(payload: NfeEmitPayload) {
  const body = {
    natureza_operacao: payload.naturezaOperacao,
    serie:             '1',
    tipo_documento:    '1',  // saída
    emitente: {
      cnpj:    payload.cnpjEmitente.replace(/\D/g, ''),
      nome:    payload.nomeEmitente,
      ie:      payload.ieEmitente,
      endereco: {
        logradouro:   payload.enderecoEmitente.logradouro,
        numero:       payload.enderecoEmitente.numero,
        municipio:    payload.enderecoEmitente.cidade,
        uf:           payload.enderecoEmitente.uf,
        cep:          payload.enderecoEmitente.cep.replace(/\D/g, ''),
      },
    },
    destinatario: {
      cpf:   payload.cpfDestinatario?.replace(/\D/g, ''),
      cnpj:  payload.cnpjDestinatario?.replace(/\D/g, ''),
      nome:  payload.nomeDestinatario,
      email: payload.emailDestinatario,
    },
    itens: payload.itens.map((item, i) => ({
      numero:          String(i + 1),
      descricao:       item.descricao,
      quantidade:      item.quantidade,
      valor_unitario:  item.valorUnitario,
      valor_total:     item.quantidade * item.valorUnitario,
      ncm:             item.ncm ?? '00000000',
      cfop:            '5102',  // venda de mercadoria
      origem:          '0',     // nacional
      cst_csosn:       '102',   // Simples Nacional sem permissão de crédito
    })),
    total: {
      valor_nf: payload.valorTotal,
    },
  }

  return request('POST', '/nfe', body)
}

export async function consultarNfe(id: string) {
  return request('GET', `/nfe/${id}`)
}

export async function cancelarNfe(id: string, justificativa: string) {
  return request('POST', `/nfe/${id}/cancelamento`, { justificativa })
}

export async function downloadNfePdf(id: string): Promise<string> {
  const data = await request('GET', `/nfe/${id}/pdf`)
  return data.url ?? data.link ?? ''
}

// ── NFS-e (serviços) ───────────────────────────────────────────────

export async function emitirNfse(payload: NfseEmitPayload) {
  const body = {
    prestador: {
      cnpj:             payload.cnpjPrestador.replace(/\D/g, ''),
      inscricao_municipal: payload.imPrestador,
      nome:             payload.nomePrestador,
    },
    tomador: {
      cpf:   payload.cpfTomador?.replace(/\D/g, ''),
      cnpj:  payload.cnpjTomador?.replace(/\D/g, ''),
      nome:  payload.nomeTomador,
      email: payload.emailTomador,
    },
    servico: {
      descricao:                   payload.descricaoServico,
      valor_servico:               payload.valorServico,
      codigo_tributacao_municipio: payload.codigoTributacaoMunicipio,
      item_lista_servico:          payload.itemListaServico ?? '14.01',  // serviços veterinários
    },
  }

  return request('POST', '/nfse', body)
}

export async function consultarNfse(id: string) {
  return request('GET', `/nfse/${id}`)
}

export async function cancelarNfse(id: string) {
  return request('DELETE', `/nfse/${id}`)
}

export function isConfigured(): boolean {
  return !!(process.env.NUVEM_FISCAL_CLIENT_ID && process.env.NUVEM_FISCAL_CLIENT_SECRET)
}
