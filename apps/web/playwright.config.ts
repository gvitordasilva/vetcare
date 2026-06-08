import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Sobe o dev server automaticamente ao rodar localmente
  webServer: process.env.CI ? undefined : {
    // roda `next dev` dentro de apps/web (cwd padrão = dir do playwright.config.ts)
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60000,
  },
})
