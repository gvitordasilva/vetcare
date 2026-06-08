import { defineConfig, devices } from '@playwright/test'

// Por padrão aponta para a produção (Vercel + Railway).
// Para rodar local: PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e
// (nesse caso suba os serviços antes: npm run dev na raiz do monorepo)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://vetcare-web-taupe.vercel.app'

const isLocal = BASE_URL.includes('localhost')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
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

  // WebServer só é usado ao rodar contra localhost.
  // Requer que a API (porta 3001) também esteja rodando — use `npm run dev` na raiz.
  webServer: isLocal ? {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  } : undefined,
})
