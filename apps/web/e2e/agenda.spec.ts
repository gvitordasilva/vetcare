import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test.describe('Agenda', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('agenda carrega sem erros', async ({ page }) => {
    await page.goto('/agenda')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 })
    // Não deve ter mensagem de erro
    await expect(page.getByText(/erro interno|500|something went wrong/i)).not.toBeVisible()
  })

  test('navegar entre dias não causa erro', async ({ page }) => {
    await page.goto('/agenda')

    // Clica no botão de próximo dia (se existir)
    const nextBtn = page.locator('button[aria-label*="próximo" i], button:has-text("›"), button:has-text(">")')
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
      await page.waitForTimeout(500)
      await expect(page.getByText(/erro/i)).not.toBeVisible()
    }
  })

  test('criar novo agendamento abre dialog', async ({ page }) => {
    await page.goto('/agenda')

    const newBtn = page.locator('button:has-text("Novo Agendamento"), button:has-text("Agendar")')
    await expect(newBtn.first()).toBeVisible({ timeout: 5000 })
    await newBtn.first().click()

    // O dialog deve abrir
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 })
  })
})
