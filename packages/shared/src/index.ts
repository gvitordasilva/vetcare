// ─── Tenant / Auth ───────────────────────────────────────────────
export interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  phone: string
  address: string
  logoUrl?: string
  plan: 'FREE' | 'PRO' | 'ENTERPRISE'
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

export type UserRole = 'OWNER' | 'ADMIN' | 'VET' | 'RECEPTIONIST'

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
