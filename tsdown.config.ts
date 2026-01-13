import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/{webpack,rspack}/loaders/*'],
  define: {
    __DEV__: 'false',
  },
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
  fixedExtension: true,
  inlineOnly: [],
  exports: true,
})
