import type { Options } from 'tsup'
import { copy } from 'esbuild-plugin-copy'
import Unused from 'unplugin-unused/esbuild'

export const tsup: Options = {
  splitting: false,
  sourcemap: false,
  clean: true,
  format: ['cjs', 'esm'],
  target: 'node14',
  dts: true,
  shims: true,
  entry: [
    'src/index.ts',
    'src/webpack/loaders/*',
    'src/rspack/loaders/*',
  ],
  external: [
    'vite',
    'webpack',
    'rollup',
    'esbuild',
    '@farmfe/core',
  ],
  define: {
    __DEV__: 'false',
  },
  esbuildPlugins: [
    copy({
      assets: [
        {
          from: ['./src/rspack/virtual.js'],
          to: ['./rspack/virtual.js'],
        },
      ],
    }),
    Unused({ level: 'error' }),
  ],
}
