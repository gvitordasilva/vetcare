import axios from 'axios'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export const api = axios.create({
  baseURL: API_URL,
})

api.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config

    // Não tenta refresh no próprio endpoint de login
    if (original.url?.includes('/auth/login')) return Promise.reject(err)

    // 402 = assinatura expirada/inexistente → redireciona para tela de assinatura
    if (err.response?.status === 402 && err.response?.data?.subscriptionRequired) {
      // Evitar loop de redirect dentro da própria rota /assinar
      if (!original.url?.includes('/billing')) {
        window.location.href = '/assinar'
        return Promise.reject(err)
      }
    }

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = Cookies.get('refreshToken')

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
          Cookies.set('accessToken', data.accessToken, { expires: 1 / 96 }) // 15 min
          Cookies.set('refreshToken', data.refreshToken, { expires: 30 })
          original.headers.Authorization = `Bearer ${data.accessToken}`
          return axios(original)
        } catch {
          Cookies.remove('accessToken')
          Cookies.remove('refreshToken')
          window.location.href = '/login'
        }
      } else {
        window.location.href = '/login'
      }
    }

    return Promise.reject(err)
  }
)

// Typed helpers
export const authApi = {
  login: (slug: string, email: string, password: string) =>
    api.post('/auth/login', { slug, email, password }).then(r => r.data),
  register: (data: any) =>
    api.post('/auth/register', data).then(r => r.data),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
}

export const patientsApi = {
  list: (params?: any) => api.get('/patients', { params }).then(r => r.data),
  get: (id: string) => api.get(`/patients/${id}`).then(r => r.data),
  create: (data: any) => api.post('/patients', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/patients/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/patients/${id}`).then(r => r.data),
  uploadPhoto: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/patients/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
}

export const ownersApi = {
  list: (params?: any) => api.get('/owners', { params }).then(r => r.data),
  get: (id: string) => api.get(`/owners/${id}`).then(r => r.data),
  create: (data: any) => api.post('/owners', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/owners/${id}`, data).then(r => r.data),
}

export const appointmentsApi = {
  list: (params?: any) => api.get('/appointments', { params }).then(r => r.data),
  get: (id: string) => api.get(`/appointments/${id}`).then(r => r.data),
  create: (data: any) => api.post('/appointments', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/appointments/${id}`, data).then(r => r.data),
  updateStatus: (id: string, status: string) => api.patch(`/appointments/${id}/status`, { status }).then(r => r.data),
  cancel: (id: string) => api.delete(`/appointments/${id}`).then(r => r.data),
}

export const consultationsApi = {
  list: (params?: any) => api.get('/consultations', { params }).then(r => r.data),
  get: (id: string) => api.get(`/consultations/${id}`).then(r => r.data),
  create: (data: any) => api.post('/consultations', data).then(r => r.data),
}

export const vaccinesApi = {
  list:   (params?: any) => api.get('/vaccines', { params }).then(r => r.data),
  create: (data: any)    => api.post('/vaccines', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/vaccines/${id}`, data).then(r => r.data),
  delete: (id: string)   => api.delete(`/vaccines/${id}`).then(r => r.data),
}

export const invoicesApi = {
  list:   (params?: any) => api.get('/invoices', { params }).then(r => r.data),
  create: (data: any)    => api.post('/invoices', data).then(r => r.data),
  pay:    (id: string, paymentMethod: string) =>
    api.patch(`/invoices/${id}/pay`, { paymentMethod }).then(r => r.data),
  cancel: (id: string, reason?: string) =>
    api.patch(`/invoices/${id}/cancel`, { reason }).then(r => r.data),
}

export const dashboardApi = {
  get: () => api.get('/dashboard').then(r => r.data),
  revenue: () => api.get('/dashboard/revenue').then(r => r.data),
}

export const tenantApi = {
  get:         () => api.get('/tenant').then(r => r.data),
  update:      (data: any) => api.put('/tenant', data).then(r => r.data),
  users:       () => api.get('/tenant/users').then(r => r.data),
  createUser:  (data: any) => api.post('/tenant/users', data).then(r => r.data),
  updateUser:  (id: string, data: any) => api.put(`/tenant/users/${id}`, data).then(r => r.data),
  deleteUser:  (id: string) => api.delete(`/tenant/users/${id}`).then(r => r.data),
}

export const hospitalizationsApi = {
  whiteboard: () => api.get('/hospitalizations/whiteboard').then(r => r.data),
  list: (params?: any) => api.get('/hospitalizations', { params }).then(r => r.data),
  get: (id: string) => api.get(`/hospitalizations/${id}`).then(r => r.data),
  create: (data: any) => api.post('/hospitalizations', data).then(r => r.data),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/hospitalizations/${id}/status`, { status, notes }).then(r => r.data),
  addEvolution: (id: string, data: any) =>
    api.post(`/hospitalizations/${id}/evolutions`, data).then(r => r.data),
  addPrescription: (id: string, data: any) =>
    api.post(`/hospitalizations/${id}/prescriptions`, data).then(r => r.data),
  applyPrescription: (id: string, prescId: string, data: any) =>
    api.post(`/hospitalizations/${id}/prescriptions/${prescId}/apply`, data).then(r => r.data),
}

export const groomingApi = {
  packages:      (params?: any) => api.get('/grooming/packages', { params }).then(r => r.data),
  createPackage: (data: any)    => api.post('/grooming/packages', data).then(r => r.data),
  useSession:    (id: string)   => api.post(`/grooming/packages/${id}/use`).then(r => r.data),
  updatePackage: (id: string, data: any) => api.patch(`/grooming/packages/${id}`, data).then(r => r.data),
  deletePackage: (id: string)   => api.delete(`/grooming/packages/${id}`).then(r => r.data),
}

export const reportsApi = {
  financial: (year?: number) => api.get('/reports/financial', { params: { year } }).then(r => r.data),
  services: (params?: any) => api.get('/reports/services', { params }).then(r => r.data),
  topPatients: (limit?: number) => api.get('/reports/top-patients', { params: { limit } }).then(r => r.data),
}

export const portalAdminApi = {
  activatePortal: (ownerId: string, password: string) =>
    api.post(`/portal/owners/${ownerId}/activate`, { password }).then(r => r.data),
  revokePortal: (ownerId: string) =>
    api.delete(`/portal/owners/${ownerId}/access`).then(r => r.data),
}

export const fiscalApi = {
  list:   (params?: any) => api.get('/fiscal', { params }).then(r => r.data),
  get:    (id: string)   => api.get(`/fiscal/${id}`).then(r => r.data),
  emit:   (invoiceId: string, type: 'NFE' | 'NFSE' = 'NFSE') =>
    api.post('/fiscal/emit', { invoiceId, type }).then(r => r.data),
  cancel: (id: string, justificativa: string) =>
    api.post(`/fiscal/${id}/cancel`, { justificativa }).then(r => r.data),
}

export const commissionApi = {
  summary:  (year: number, month?: number) =>
    api.get('/commissions/summary', { params: { year, month } }).then(r => r.data),
  vets:     () => api.get('/commissions/vets').then(r => r.data),
  setRate:  (vetId: string, commissionRate: number) =>
    api.patch(`/commissions/vets/${vetId}`, { commissionRate }).then(r => r.data),
  history:  (vetId: string, year: number) =>
    api.get(`/commissions/vets/${vetId}/history`, { params: { year } }).then(r => r.data),
}

export const teleconsultationApi = {
  status: () => api.get('/teleconsultation/status').then(r => r.data),
  list:   (params?: any) => api.get('/teleconsultation', { params }).then(r => r.data),
  create: (data: any)   => api.post('/teleconsultation', data).then(r => r.data),
  join:   (id: string)  => api.get(`/teleconsultation/${id}/join`).then(r => r.data),
  end:    (id: string, notes?: string) =>
    api.patch(`/teleconsultation/${id}/end`, { notes }).then(r => r.data),
}

export const aiScribeApi = {
  status:    () => api.get('/ai-scribe/status').then(r => r.data),
  transcribe:(formData: FormData) =>
    api.post('/ai-scribe/transcribe', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  structure: (text: string) => api.post('/ai-scribe/structure', { text }).then(r => r.data),
}

export const billingApi = {
  status:    () => api.get('/billing/status').then(r => r.data),
  subscribe: (data: {
    plan: 'PRO' | 'ENTERPRISE'
    billingCycle?: 'MONTHLY' | 'ANNUAL'
    paymentMethod?: 'PIX' | 'BOLETO' | 'CREDIT_CARD'
    cpfCnpj?: string
  }) => api.post('/billing/subscribe', data).then(r => r.data),
  payments:  (params?: any) => api.get('/billing/payments', { params }).then(r => r.data),
  payment:   (id: string)   => api.get(`/billing/payments/${id}`).then(r => r.data),
  cancel:    (reason?: string) => api.post('/billing/cancel', { reason }).then(r => r.data),
}
