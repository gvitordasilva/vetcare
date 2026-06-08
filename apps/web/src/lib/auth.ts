import Cookies from 'js-cookie'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
}

export interface AuthTenant {
  id: string
  name: string
  slug: string
  logoUrl?: string
}

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function getTenant(): AuthTenant | null {
  try {
    const raw = localStorage.getItem('tenant')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function setAuth(data: { accessToken: string; refreshToken: string; user: AuthUser; tenant: AuthTenant }) {
  Cookies.set('accessToken', data.accessToken, { expires: 1 / 96, sameSite: 'strict' })
  Cookies.set('refreshToken', data.refreshToken, { expires: 30, sameSite: 'strict' })
  localStorage.setItem('user', JSON.stringify(data.user))
  localStorage.setItem('tenant', JSON.stringify(data.tenant))
}

export function clearAuth() {
  Cookies.remove('accessToken')
  Cookies.remove('refreshToken')
  localStorage.removeItem('user')
  localStorage.removeItem('tenant')
}

export function isAuthenticated(): boolean {
  return !!Cookies.get('accessToken') || !!Cookies.get('refreshToken')
}
