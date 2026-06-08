import { Page } from '@playwright/test'

export const DEMO = {
  slug: 'demo-clinic',
  email: 'admin@vetcare.com.br',
  password: 'Admin@123',
}

/** Realiza login na clínica demo e aguarda o dashboard carregar */
export async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.fill('input[placeholder*="minha-clinica"]', DEMO.slug)
  await page.fill('input[type="email"]', DEMO.email)
  await page.fill('input[type="password"]', DEMO.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 10000 })
}
