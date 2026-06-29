import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/{webpack,rspack}/loaders/*'],
  define: {
    'import.meta.dev': 'false',
  },
  deps: {
    onlyBundle: [],
    neverBundle: [
      // peer dependencies
      'vite',
      'webpack',
      'rollup',
      'esbuild',
      '@farmfe/core',
      '@rsbuild/core',
      '@rspack/core',
      'rolldown',
      'unloader',
    ],
  },
  unused: {
    level: 'error',
    ignore: ['bun-types-no-globals'],
  },
  exports: true,
  publint: 'ci-only',
  attw: {
    enabled: 'ci-only',
    profile: 'esm-only',
  },
})
