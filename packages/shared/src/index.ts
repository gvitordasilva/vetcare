// ─── Tenant / Auth ───────────────────────────────────────────────
export interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  phone: string
  address: string
  logoUrl?: string
  plan: 'PRO' | 'ENTERPRISE'
  trialEndsAt?: Date
  asaasCustomerId?: string
  active: boolean
  createdAt: Date
}

export interface User {
  id: string
  tenantId: string
  name: string
  email: string
  role: UserRole
  active: boolean
  createdAt: Date
}

export type UserRole = 'OWNER' | 'ADMIN' | 'VET' | 'RECEPTIONIST' | 'TUTOR'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface JWTPayload {
  sub: string        // userId
  tid: string        // tenantId
  role: UserRole
  iat: number
  exp: number
}

// ─── Patient / Animal ────────────────────────────────────────────
export interface Patient {
  id: string
  tenantId: string
  name: string
  species: Species
  breed: string
  gender: 'MALE' | 'FEMALE'
  birthDate?: Date
  weight?: number
  color?: string
  microchip?: string
  photoUrl?: string
  notes?: string
  active: boolean
  ownerId: string
  owner?: Owner
  createdAt: Date
  updatedAt: Date
}

export type Species = 'DOG' | 'CAT' | 'BIRD' | 'RABBIT' | 'HAMSTER' | 'REPTILE' | 'OTHER'

export interface Owner {
  id: string
  tenantId: string
  name: string
  email?: string
  phone: string
  cpf?: string
  address?: string
  patients?: Patient[]
  createdAt: Date
}

// ─── Appointment ─────────────────────────────────────────────────
export interface Appointment {
  id: string
  tenantId: string
  patientId: string
  patient?: Patient
  vetId: string
  vet?: User
  scheduledAt: Date
  duration: number       // minutes
  status: AppointmentStatus
  type: AppointmentType
  notes?: string
  createdAt: Date
}

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
export type AppointmentType = 'CONSULTATION' | 'RETURN' | 'VACCINE' | 'SURGERY' | 'EXAM' | 'GROOMING' | 'EMERGENCY'

// ─── Consultation / Medical Record ───────────────────────────────
export interface Consultation {
  id: string
  tenantId: string
  appointmentId?: string
  patientId: string
  patient?: Patient
  vetId: string
  vet?: User
  date: Date
  weight?: number
  temperature?: number
  heartRate?: number
  respiratoryRate?: number
  anamnesis: string
  physicalExam: string
  diagnosis: string
  treatment: string
  prescriptions?: Prescription[]
  exams?: ExamRequest[]
  followUpDate?: Date
  createdAt: Date
}

export interface Prescription {
  id: string
  consultationId: string
  medication: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

export interface ExamRequest {
  id: string
  consultationId: string
  examType: string
  laboratory?: string
  notes?: string
  status: 'REQUESTED' | 'DONE' | 'CANCELLED'
  resultUrl?: string
}

// ─── Vaccines ─────────────────────────────────────────────────────
export interface Vaccine {
  id: string
  tenantId: string
  patientId: string
  patient?: Patient
  vetId: string
  name: string
  manufacturer?: string
  lot?: string
  dose: string
  appliedAt: Date
  nextDoseAt?: Date
  reminderSent: boolean
  notes?: string
}

// ─── Financial ────────────────────────────────────────────────────
export interface Invoice {
  id: string
  tenantId: string
  patientId?: string
  ownerId?: string
  appointmentId?: string
  number: string
  items: InvoiceItem[]
  subtotal: number
  discount: number
  total: number
  status: 'PENDING' | 'PAID' | 'CANCELLED'
  paymentMethod?: 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX' | 'TRANSFER'
  paidAt?: Date
  dueDate?: Date
  createdAt: Date
}

export interface InvoiceItem {
  id: string
  invoiceId: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

// ─── Billing ─────────────────────────────────────────────────────
export type Plan = 'PRO' | 'ENTERPRISE'
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED'
export type BillingCycle = 'MONTHLY' | 'ANNUAL'
export type BillingPaymentStatus = 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'OVERDUE' | 'REFUNDED' | 'CANCELLED'
export type AccessStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'BLOCKED'

export const PLAN_LIMITS = {
  PRO: {
    maxUsers: 15,
    maxPatients: 2_000,
    maxAppointmentsPerMonth: 500,
    modules: {
      aiScribe: true,
      telemedicine: true,
      nfe: true,
      hospitalization: true,
      advancedReports: true,
    },
  },
  ENTERPRISE: {
    maxUsers: Infinity,
    maxPatients: Infinity,
    maxAppointmentsPerMonth: Infinity,
    modules: {
      aiScribe: true,
      telemedicine: true,
      nfe: true,
      hospitalization: true,
      advancedReports: true,
    },
  },
} as const

export type PlanModule = keyof typeof PLAN_LIMITS.PRO.modules

export const PLAN_PRICES = {
  PRO: { monthly: 19700, annual: 189200 },       // em centavos
  ENTERPRISE: { monthly: 49700, annual: 477200 }, // em centavos
} as const

export interface Subscription {
  id: string
  tenantId: string
  plan: Plan
  status: SubscriptionStatus
  billingCycle: BillingCycle
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelledAt?: Date
  priceInCents: number
  createdAt: Date
}

export interface BillingStatus {
  status: AccessStatus
  trialDaysRemaining?: number
  trialEndsAt?: Date
  subscription?: {
    plan: Plan
    status: SubscriptionStatus
    billingCycle: BillingCycle
    currentPeriodEnd: Date
    priceInCents: number
  }
  lastPayment?: {
    status: BillingPaymentStatus
    dueDate: Date
    paidAt?: Date
    pixQrCode?: string
    pixCopiaECola?: string
    boletoUrl?: string
    boletoBarCode?: string
  }
}

// ─── API Response ─────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
