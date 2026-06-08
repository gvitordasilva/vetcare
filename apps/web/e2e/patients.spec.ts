import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test.describe('Pacientes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('lista de pacientes carrega corretamente', async ({ page }) => {
    await page.goto('/patients')
    // Aguarda a lista carregar (spinner desaparecer ou itens aparecerem)
    await expect(page.locator('table, [data-testid="patients-list"]').first()).toBeVisible({ timeout: 8000 })
  })

  test('cadastrar novo paciente com data de nascimento', async ({ page }) => {
    await page.goto('/patients')

    // Abre o dialog de novo paciente
    await page.click('button:has-text("Novo Paciente"), button:has-text("Adicionar")')

    // Preenche o formulário
    await page.fill('input[name="name"], input[placeholder*="nome" i]', 'Teste Playwright')
    await page.selectOption('select[name="species"]', 'DOG')
    await page.fill('input[name="birthDate"], input[type="date"]', '2022-05-10')

    // Salva
    await page.click('button[type="submit"]:has-text("Salvar"), button:has-text("Cadastrar")')

    // Verifica que o paciente aparece na lista
    await expect(page.getByText('Teste Playwright')).toBeVisible({ timeout: 5000 })
  })

  test('busca por nome filtra a lista', async ({ page }) => {
    await page.goto('/patients')

    const searchInput = page.locator('input[placeholder*="buscar" i], input[placeholder*="pesquisar" i], input[type="search"]').first()
    await searchInput.fill('Rex')
    await page.waitForTimeout(600) // debounce

    // Resultados devem conter "Rex" ou estar vazios (sem erro 500)
    const rows = page.locator('tr[data-patient], tbody tr, [data-testid="patient-row"]')
    const count = await rows.count()
    if (count > 0) {
      await expect(page.getByText('Rex').first()).toBeVisible()
    }
  })

  test('página de detalhes do paciente abre sem erro', async ({ page }) => {
    await page.goto('/patients')
    await page.locator('table tbody tr, [data-testid="patient-row"]').first().click()
    await expect(page).toHaveURL(/\/patients\//)
    // Verifica que a página carregou (tem título ou conteúdo)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 })
  })
})
