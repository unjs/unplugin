import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    __BUNDLED__: 'false' // during tests, the library isn't being run in bundled form
  }
})
