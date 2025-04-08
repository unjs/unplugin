import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __DEV__: 'true',
  },
  resolve: {
    alias: {
      unplugin: resolve('src/index.ts'),
    },
  },
  test: {
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
    },
  },
})
