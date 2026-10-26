import { resolve } from 'node:path'
import { defineConfig } from '@rsbuild/core'
import unplugin from './unplugin.js'

const { rsbuild } = unplugin

export default defineConfig({
  source: {
    entry: {
      main: resolve(import.meta.dirname, 'src/main.js'),
    },
  },
  output: {
    distPath: {
      root: resolve(import.meta.dirname, 'dist/rsbuild'),
      js: '',
    },
    filename: {
      js: '[name].js',
    },
    filenameHash: false,
    sourceMap: {
      js: 'source-map',
    },
  },
  plugins: [rsbuild()],
  tools: {
    htmlPlugin: false,
  },
})
