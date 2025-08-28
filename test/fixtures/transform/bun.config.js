const Bun = require('bun')
const { bun } = require('./unplugin')

await Bun.build({
  entrypoints: ['./src/main.js'],
  outdir: './dist/bun',
  plugins: [bun({ msg: 'Bun' })],
})
