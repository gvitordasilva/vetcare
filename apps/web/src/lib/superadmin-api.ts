import axios from 'axios'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export const saApi = axios.create({ baseURL: `${API_URL}/superadmin` })

saApi.interceptors.request.use((config) => {
  const token = Cookies.get('sa_accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

saApi.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config

    // Não tenta refresh no próprio endpoint de login
    if (original.url?.includes('/auth/login')) return Promise.reject(err)

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = Cookies.get('sa_refreshToken')
      if (refreshToken) {
        try {
          const { data } = await saApi.post('/auth/refresh', { refreshToken })
          Cookies.set('sa_accessToken', data.accessToken, { expires: 1 / 96 })
          Cookies.set('sa_refreshToken', data.refreshToken, { expires: 30 })
          original.headers.Authorization = `Bearer ${data.accessToken}`
          return saApi(original)
        } catch {
          Cookies.remove('sa_accessToken')
          Cookies.remove('sa_refreshToken')
          window.location.href = '/superadmin/login'
        }
      } else {
        window.location.href = '/superadmin/login'
      }
    }
    return Promise.reject(err)
  }
)

export function setSuperAdminAuth(data: { accessToken: string; refreshToken: string; superAdmin: any }) {
  Cookies.set('sa_accessToken', data.accessToken, { expires: 1 / 96, sameSite: 'strict' })
  Cookies.set('sa_refreshToken', data.refreshToken, { expires: 30, sameSite: 'strict' })
  localStorage.setItem('superAdmin', JSON.stringify(data.superAdmin))
}

export function clearSuperAdminAuth() {
  Cookies.remove('sa_accessToken')
  Cookies.remove('sa_refreshToken')
  localStorage.removeItem('superAdmin')
}

export function isSuperAdminAuthenticated() {
  return !!Cookies.get('sa_accessToken') || !!Cookies.get('sa_refreshToken')
}

export function getSuperAdmin() {
  try { return JSON.parse(localStorage.getItem('superAdmin') || 'null') } catch { return null }
}

// API helpers
export const superAdminApi = {
  login: (email: string, password: string) =>
    saApi.post('/auth/login', { email, password }).then(r => r.data),

  metrics: () => saApi.get('/metrics').then(r => r.data),

  tenants: (params?: any) => saApi.get('/tenants', { params }).then(r => r.data),
  getTenant: (id: string) => saApi.get(`/tenants/${id}`).then(r => r.data),
  createTenant: (data: any) => saApi.post('/tenants', data).then(r => r.data),
  updateTenant: (id: string, data: any) => saApi.patch(`/tenants/${id}`, data).then(r => r.data),

  createUser: (tenantId: string, data: any) =>
    saApi.post(`/tenants/${tenantId}/users`, data).then(r => r.data),
  resetPassword: (tenantId: string, userId: string, password: string) =>
    saApi.patch(`/tenants/${tenantId}/users/${userId}/reset-password`, { password }).then(r => r.data),
}
