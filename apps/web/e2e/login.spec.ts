import { test, expect } from '@playwright/test'
import { loginAsAdmin, DEMO } from './helpers'

test.describe('Autenticação', () => {
  test('login com credenciais corretas redireciona para o dashboard', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/dashboard/)
    // Verifica que o dashboard carregou com algum conteúdo
    await expect(page.locator('h1, h2, nav').first()).toBeVisible()
  })

  test('login com senha errada exibe mensagem de erro', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[placeholder*="minha-clinica"]', DEMO.slug)

    // Aguarda o slug check concluir (botão precisa ficar habilitado antes de digitar email/senha)
    await page.waitForFunction(
      () => {
        const btn = document.querySelector<HTMLButtonElement>('button[type="submit"]')
        return btn !== null && !btn.disabled
      },
      { timeout: 8000 },
    )

    await page.fill('input[type="email"]', DEMO.email)
    await page.fill('input[type="password"]', 'SenhaErrada123')
    await page.click('button[type="submit"]')

    // Deve ficar na página de login com mensagem de erro
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText(/incorretos|inválid|erro/i)).toBeVisible({ timeout: 8000 })
  })

  test('login com slug inexistente exibe erro no campo', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[placeholder*="minha-clinica"]', 'clinica-nao-existe')

    // Aguarda o slug check mostrar "não encontrado"
    await expect(page.getByText(/não encontrad/i)).toBeVisible({ timeout: 8000 })

    // Botão continua habilitado mesmo com slug not-found (apenas mostra aviso visual)
    // Preenche o resto e tenta submeter
    await page.fill('input[type="email"]', 'qualquer@email.com')
    await page.fill('input[type="password"]', 'Qualquer@123')

    // Tenta clicar no submit (pode estar disabled dependendo do status)
    const btn = page.locator('button[type="submit"]')
    const isDisabled = await btn.isDisabled()
    if (!isDisabled) {
      await btn.click()
      await expect(page).toHaveURL(/\/login/)
      await expect(page.getByText(/incorretos|inválid|não encontrad/i)).toBeVisible({ timeout: 8000 })
    } else {
      // Botão disabled = comportamento correto (slug inválido bloqueia envio)
      await expect(btn).toBeDisabled()
    }
  })

  test('rota protegida redireciona para login sem autenticação', async ({ page }) => {
    await page.goto('/dashboard')
    // A proteção é client-side: o React carrega e então redireciona
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('logout limpa sessão e redireciona para login', async ({ page }) => {
    await loginAsAdmin(page)

    // Logout via botão com title="Sair" na sidebar
    await page.locator('button[title="Sair"]').click()

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})
