import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/webpack/loaders/*', 'src/rspack/loaders/*'],
  format: ['cjs', 'esm'],
  clean: true,
  target: 'node18.12',
  dts: { autoAddExts: true },
  sourcemap: false,
  define: {
    __DEV__: 'false',
  },
  shims: true,
  external: ['vite', 'webpack', 'rollup', 'esbuild', '@farmfe/core'],
  unused: { level: 'error' },
})
