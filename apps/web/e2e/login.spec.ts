import { test, expect } from '@playwright/test'
import { loginAsAdmin, DEMO } from './helpers'

test.describe('Autenticação', () => {
  test('login com credenciais corretas redireciona para o dashboard', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/dashboard/)
    // Verifica que o dashboard carregou com algum conteúdo
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('login com senha errada exibe mensagem de erro', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[placeholder*="minha-clinica"]', DEMO.slug)
    await page.fill('input[type="email"]', DEMO.email)
    await page.fill('input[type="password"]', 'SenhaErrada123')
    await page.click('button[type="submit"]')

    // Deve ficar na página de login com mensagem de erro
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText(/incorretos|inválid|erro/i)).toBeVisible()
  })

  test('login com slug inexistente exibe erro', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[placeholder*="minha-clinica"]', 'clinica-nao-existe')
    await page.fill('input[type="email"]', 'qualquer@email.com')
    await page.fill('input[type="password"]', 'Qualquer@123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText(/incorretos|inválid|não encontrad/i)).toBeVisible()
  })

  test('rota protegida redireciona para login sem autenticação', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('logout limpa sessão e redireciona para login', async ({ page }) => {
    await loginAsAdmin(page)

    // Procura e clica no botão de logout
    await page.click('[data-testid="user-menu"], button:has-text("Sair"), [aria-label*="logout" i]')
    await page.getByText(/sair|logout/i).click().catch(() => {})

    await expect(page).toHaveURL(/\/login/)
  })
})
