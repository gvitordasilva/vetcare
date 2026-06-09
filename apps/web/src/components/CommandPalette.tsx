'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, LayoutDashboard, Calendar, Users, Syringe,
  DollarSign, FileText, BarChart3, Settings, Video,
  BedDouble, Scissors, UserPlus, PawPrint, ArrowRight,
  Mic2, LogOut, Command,
} from 'lucide-react'

type CommandItem = {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  action: () => void
  group: string
  keywords?: string[]
}

function useCommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()

  const commands: CommandItem[] = [
    // Navegação
    { id: 'dashboard', label: 'Dashboard', description: 'Visão geral da clínica', icon: LayoutDashboard, action: () => router.push('/dashboard'), group: 'Navegar', keywords: ['inicio', 'home', 'inicio'] },
    { id: 'agenda', label: 'Agenda', description: 'Consultas agendadas', icon: Calendar, action: () => router.push('/agenda'), group: 'Navegar' },
    { id: 'pacientes', label: 'Pacientes', description: 'Lista de pacientes', icon: PawPrint, action: () => router.push('/patients'), group: 'Navegar', keywords: ['animais', 'pets'] },
    { id: 'tutores', label: 'Tutores', description: 'Cadastro de tutores', icon: Users, action: () => router.push('/tutores'), group: 'Navegar', keywords: ['clientes', 'donos'] },
    { id: 'vacinas', label: 'Vacinas', description: 'Controle de vacinação', icon: Syringe, action: () => router.push('/vaccines'), group: 'Navegar' },
    { id: 'internacoes', label: 'Internações', description: 'Pacientes internados', icon: BedDouble, action: () => router.push('/internacoes'), group: 'Navegar' },
    { id: 'financeiro', label: 'Financeiro', description: 'Receitas e despesas', icon: DollarSign, action: () => router.push('/financeiro'), group: 'Navegar' },
    { id: 'nfe', label: 'Notas Fiscais', description: 'NF-e e NFS-e', icon: FileText, action: () => router.push('/nfe'), group: 'Navegar', keywords: ['nfe', 'nfse', 'nota'] },
    { id: 'relatorios', label: 'Relatórios', description: 'Analytics e métricas', icon: BarChart3, action: () => router.push('/relatorios'), group: 'Navegar' },
    { id: 'telemedicina', label: 'Telemedicina', description: 'Consultas por vídeo', icon: Video, action: () => router.push('/telemedicina'), group: 'Navegar' },
    { id: 'banho-tosa', label: 'Banho & Tosa', description: 'Agendamentos de estética', icon: Scissors, action: () => router.push('/banho-tosa'), group: 'Navegar' },
    { id: 'comissoes', label: 'Comissões', description: 'Comissões da equipe', icon: DollarSign, action: () => router.push('/comissoes'), group: 'Navegar' },
    { id: 'ai-scribe', label: 'AI Scribe', description: 'Transcrição de consultas', icon: Mic2, action: () => router.push('/agenda'), group: 'Navegar', keywords: ['ia', 'inteligencia', 'transcricao'] },

    // Ações rápidas
    { id: 'new-patient', label: 'Novo Paciente', description: 'Cadastrar animal', icon: UserPlus, action: () => router.push('/patients?new=1'), group: 'Ação rápida', keywords: ['criar', 'adicionar'] },
    { id: 'new-appointment', label: 'Nova Consulta', description: 'Agendar atendimento', icon: Calendar, action: () => router.push('/agenda?new=1'), group: 'Ação rápida', keywords: ['agendar', 'marcar'] },
    { id: 'configuracoes', label: 'Configurações', description: 'Dados da clínica e plano', icon: Settings, action: () => router.push('/configuracoes'), group: 'Ação rápida' },
    { id: 'billing', label: 'Assinatura', description: 'Plano e pagamentos', icon: DollarSign, action: () => router.push('/configuracoes/billing'), group: 'Ação rápida' },
  ]

  const filtered = query.trim()
    ? commands.filter((c) => {
        const q = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        const targets = [c.label, c.description ?? '', ...(c.keywords ?? [])]
          .join(' ')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
        return targets.includes(q)
      })
    : commands

  // Agrupar
  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = []
    acc[cmd.group].push(cmd)
    return acc
  }, {})

  return { open, setOpen, query, setQuery, grouped, allItems: filtered }
}

export default function CommandPalette() {
  const { open, setOpen, query, setQuery, grouped, allItems } = useCommandPalette()
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Abrir com Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        setQuery('')
        setCursor(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setOpen, setQuery])

  // Focar input quando abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setCursor(0)
    }
  }, [open])

  // Navegação por teclado
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, allItems.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      allItems[cursor]?.action()
      setOpen(false)
    }
  }, [allItems, cursor, setOpen])

  if (!open) return null

  let globalIndex = 0

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4" onClick={() => setOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar ou ir para..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0) }}
          />
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {allItems.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              Nenhum resultado para "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <div className="px-4 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  {group}
                </div>
                {items.map((item) => {
                  const idx = globalIndex++
                  const isActive = idx === cursor
                  return (
                    <button
                      key={item.id}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isActive ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                      onClick={() => { item.action(); setOpen(false) }}
                      onMouseEnter={() => setCursor(idx)}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <item.icon className={`w-4 h-4 ${isActive ? 'text-green-600' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${isActive ? 'text-green-700' : 'text-gray-800'}`}>{item.label}</div>
                        {item.description && (
                          <div className="text-xs text-gray-400 truncate">{item.description}</div>
                        )}
                      </div>
                      {isActive && <ArrowRight className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 rounded font-mono">↑↓</kbd> navegar</span>
            <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 rounded font-mono">↵</kbd> selecionar</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <Command className="w-3 h-3" />
            <span>K para abrir</span>
          </div>
        </div>
      </div>
    </div>
  )
}
