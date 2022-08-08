import { resolve } from 'pathe'
import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    __DEV__: 'true'
  },
  resolve: {
    alias: {
      unplugin: resolve('src/index.ts')
    }
  }
})
