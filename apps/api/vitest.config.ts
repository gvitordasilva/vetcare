import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      // Aponta para o source TypeScript diretamente (evita precisar buildar o shared)
      '@vetcare/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/routes/**', 'src/middleware/**'],
    },
    setupFiles: ['./src/test-utils/setup.ts'],
  },
})
