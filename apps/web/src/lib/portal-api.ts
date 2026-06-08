/**
 * Cliente Axios exclusivo do Portal do Tutor.
 * Usa cookies separados (portalAccessToken / portalRefreshToken)
 * para não conflitar com a autenticação de staff da clínica.
 */
import axios from 'axios'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export const portalApi = axios.create({
  baseURL: `${API_URL}/portal`,
})

portalApi.interceptors.request.use((config) => {
  const token = Cookies.get('portalAccessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

portalApi.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh')) {
      return Promise.reject(err)
    }
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = Cookies.get('portalRefreshToken')
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/portal/auth/refresh`, { refreshToken })
          Cookies.set('portalAccessToken', data.accessToken, { expires: 1 / 96 })
          Cookies.set('portalRefreshToken', data.refreshToken, { expires: 30 })
          original.headers.Authorization = `Bearer ${data.accessToken}`
          return axios(original)
        } catch {
          clearPortalAuth()
          window.location.href = '/portal/login'
        }
      } else {
        window.location.href = '/portal/login'
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth helpers ──────────────────────────────────────────────────

export function setPortalAuth(accessToken: string, refreshToken: string, owner: any) {
  Cookies.set('portalAccessToken', accessToken, { expires: 1 / 96 })
  Cookies.set('portalRefreshToken', refreshToken, { expires: 30 })
  if (typeof window !== 'undefined') {
    localStorage.setItem('portalOwner', JSON.stringify(owner))
  }
}

export function clearPortalAuth() {
  Cookies.remove('portalAccessToken')
  Cookies.remove('portalRefreshToken')
  if (typeof window !== 'undefined') {
    localStorage.removeItem('portalOwner')
  }
}

export function getPortalOwner(): any | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem('portalOwner') ?? 'null') } catch { return null }
}

export function isPortalAuthenticated(): boolean {
  return !!Cookies.get('portalAccessToken')
}

// ── API helpers ───────────────────────────────────────────────────

export const portalAuthApi = {
  login:   (slug: string, email: string, password: string) =>
    portalApi.post('/auth/login', { slug, email, password }).then(r => r.data),
  logout:  (refreshToken: string) =>
    portalApi.post('/auth/logout', { refreshToken }),
}

export const portalPetsApi = {
  list: () => portalApi.get('/pets').then(r => r.data),
  get:  (id: string) => portalApi.get(`/pets/${id}`).then(r => r.data),
}

export const portalInvoicesApi = {
  list: (params?: any) => portalApi.get('/invoices', { params }).then(r => r.data),
}
