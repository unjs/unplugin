const { build } = require('esbuild')
const { esbuild } = require('./unplugin')

build({
  entryPoints: ['src/main.js'],
  bundle: true,
  outdir: 'dist/esbuild',
  sourcemap: true,
  plugins: [
    esbuild(),
  ],
})
