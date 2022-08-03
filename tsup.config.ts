// tsup.config.ts
import type { Options } from 'tsup'

export const tsup: Options = {
  splitting: false,
  sourcemap: false,
  clean: true,
  format: ['cjs', 'esm'],
  dts: true,
  entryPoints: [
    'src/index.ts',
    'src/webpack/loaders/load.ts',
    'src/webpack/loaders/transform.ts'
  ],
  define: {
    __DEV__: 'false'
  }
}
