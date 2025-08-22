import * as Bun from 'bun'
import unplugin from './unplugin.js'

const plugin = unplugin.bun()

await Bun.build({
  entrypoints: ['./src/main.js'],
  outdir: './dist',
  plugins: [plugin],
})
