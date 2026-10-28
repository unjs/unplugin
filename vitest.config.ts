import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    'import.meta.dev': 'true',
  },
  resolve: {
    alias: [
      {
        find: /^unplugin$/,
        replacement: resolve('src/index.ts'),
      },
      {
        find: /^unplugin\/utils\/filter$/,
        replacement: resolve('src/filter.ts'),
      },
    ],
  },
  test: {
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
    },
  },
})
