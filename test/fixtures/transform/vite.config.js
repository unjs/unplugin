const { resolve } = require('path')
const { vite } = require('./unplugin')

module.exports = {
  root: __dirname,
  plugins: [
    vite({ msg: 'Vite' })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      name: 'main',
      fileName: 'main.js'
    },
    outDir: 'dist/vite'
  }
}
