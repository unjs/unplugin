import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/{webpack,rspack}/loaders/*'],
  define: {
    __DEV__: 'false',
  },
  // peer dependencies
  external: ['vite', 'webpack', 'rollup', 'esbuild', '@farmfe/core'],
  unused: { level: 'error' },
  fixedExtension: true,
  inlineOnly: [],
  exports: true,
})
