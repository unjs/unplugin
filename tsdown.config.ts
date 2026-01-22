import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/{webpack,rspack}/loaders/*'],
  define: {
    'import.meta.dev': 'false',
  },
  inlineOnly: [],
  external: [
    // peer dependencies
    'vite',
    'webpack',
    'rollup',
    'esbuild',
    '@farmfe/core',
    '@rspack/core',
    'rolldown',
    'unloader',
  ],
  unused: { level: 'error' },
  exports: true,
})
