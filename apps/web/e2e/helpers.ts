import { Page } from '@playwright/test'

export const DEMO = {
  slug: 'demo-clinic',
  email: 'admin@vetcare.com.br',
  password: 'Admin@123',
}

/** Realiza login na clínica demo e aguarda o dashboard carregar */
export async function loginAsAdmin(page: Page) {
  await page.goto('/login')

  // Preenche o slug — isso dispara o debounce de 600ms que chama GET /auth/clinic-check
  await page.fill('input[placeholder*="minha-clinica"]', DEMO.slug)

  // Aguarda o botão de submit ficar habilitado (slug check concluído com sucesso)
  // O botão fica disabled enquanto slugStatus === 'checking' | 'not-found' | 'suspended'
  await page.locator('button[type="submit"]').waitFor({ state: 'visible' })
  await page.waitForFunction(
    () => {
      const btn = document.querySelector<HTMLButtonElement>('button[type="submit"]')
      return btn !== null && !btn.disabled
    },
    { timeout: 8000 },
  )

  await page.fill('input[type="email"]', DEMO.email)
  await page.fill('input[type="password"]', DEMO.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}
