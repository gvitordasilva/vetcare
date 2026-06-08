import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string, fmt = "dd/MM/yyyy") {
  return format(new Date(date), fmt, { locale: ptBR })
}

export function formatDateTime(date: Date | string) {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export const SPECIES_LABELS: Record<string, string> = {
  DOG: 'Cão',
  CAT: 'Gato',
  BIRD: 'Ave',
  RABBIT: 'Coelho',
  HAMSTER: 'Hamster',
  REPTILE: 'Réptil',
  OTHER: 'Outro',
}

export const SPECIES_EMOJIS: Record<string, string> = {
  DOG: '🐕',
  CAT: '🐈',
  BIRD: '🦜',
  RABBIT: '🐇',
  HAMSTER: '🐹',
  REPTILE: '🦎',
  OTHER: '🐾',
}

export const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  CONSULTATION: 'Consulta',
  RETURN: 'Retorno',
  VACCINE: 'Vacinação',
  SURGERY: 'Cirurgia',
  EXAM: 'Exame',
  GROOMING: 'Banho/Tosa',
  EMERGENCY: 'Emergência',
}

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não Compareceu',
}

export const STATUS_COLORS: Record<string, string> = {
  // Appointment statuses
  SCHEDULED:   'bg-blue-100 text-blue-700',
  CONFIRMED:   'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED:   'bg-gray-100 text-gray-700',
  NO_SHOW:     'bg-orange-100 text-orange-700',
  // Invoice statuses
  PENDING:     'bg-yellow-100 text-yellow-700',
  PAID:        'bg-green-100 text-green-700',
  OVERDUE:     'bg-red-100 text-red-700',
  // Shared
  CANCELLED:   'bg-red-50 text-red-500',
}

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  PENDING:   'Pendente',
  PAID:      'Pago',
  OVERDUE:   'Vencido',
  CANCELLED: 'Cancelado',
}
