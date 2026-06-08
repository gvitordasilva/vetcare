'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { fiscalApi } from '@/lib/api'

const STATUS_CONFIG = {
  PENDING:    { label: 'Pendente',    icon: Clock,         bg: 'bg-gray-50',   text: 'text-gray-600'  },
  PROCESSING: { label: 'Processando', icon: RefreshCw,     bg: 'bg-blue-50',   text: 'text-blue-600'  },
  AUTHORIZED: { label: 'Autorizada',  icon: CheckCircle,   bg: 'bg-green-50',  text: 'text-green-700' },
  CANCELLED:  { label: 'Cancelada',   icon: XCircle,       bg: 'bg-gray-50',   text: 'text-gray-500'  },
  REJECTED:   { label: 'Rejeitada',   icon: AlertCircle,   bg: 'bg-red-50',    text: 'text-red-600'   },
}

export default function NfePage() {
  const qc = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['fiscal-docs'],
    queryFn:  () => fiscalApi.list(),
    refetchInterval: 15_000,  // auto-atualiza a cada 15s enquanto tiver PROCESSING
  })

  const docs = data?.data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notas Fiscais</h1>
          <p className="text-sm text-gray-500 mt-1">NF-e (produtos) e NFS-e (serviços veterinários)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Aviso de configuração */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Configuração necessária</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Para emitir notas fiscais, configure o CNPJ da clínica em <strong>Configurações → Dados Fiscais</strong> e
            as variáveis <code>NUVEM_FISCAL_CLIENT_ID</code> e <code>NUVEM_FISCAL_CLIENT_SECRET</code> no servidor.
          </p>
        </div>
      </div>

      {/* Como emitir */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Como emitir uma nota fiscal</h2>
        <ol className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
            Abra a cobrança <strong>Paga</strong> na aba Financeiro
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
            Clique em <strong>"Emitir Nota Fiscal"</strong> — escolha NFS-e (serviços) ou NF-e (produtos)
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
            O sistema emite via <strong>Nuvem Fiscal</strong> e retorna aqui em instantes
          </li>
        </ol>
      </div>

      {/* Lista de documentos */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <FileText className="w-12 h-12 mb-3 opacity-40" />
          <p>Nenhuma nota fiscal emitida ainda</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Tipo', 'Número', 'Status', 'Cobrança', 'Emissão', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {docs.map((doc: any) => {
                const cfg  = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING
                const Icon = cfg.icon
                return (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                        {doc.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">{doc.number ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${cfg.bg} ${cfg.text}`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {doc.invoice ? `#${doc.invoice.number}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {doc.issuedAt ? format(new Date(doc.issuedAt), 'dd/MM/yy HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {doc.pdfUrl && (
                          <a href={doc.pdfUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary font-medium hover:underline">
                            PDF
                          </a>
                        )}
                        {doc.xmlUrl && (
                          <a href={doc.xmlUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-gray-500 hover:underline">
                            XML
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
