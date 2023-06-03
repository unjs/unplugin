// tsup.config.ts
import type { Options } from 'tsup'

export const tsup: Options = {
  splitting: false,
  sourcemap: false,
  clean: true,
  format: ['cjs', 'esm'],
  target: 'node16.14',
  dts: true,
  shims: true,
  entryPoints: [
    'src/index.ts',
    'src/webpack/loaders/*',
    'src/rspack/loaders/*',
  ],
  external: [
    'vite',
    'webpack',
    'rollup',
    'esbuild',
  ],
  define: {
    __DEV__: 'false',
  },
}
