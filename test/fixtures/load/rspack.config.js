const { resolve } = require('path')
const { rspack } = require('./unplugin')

/** @type {import('@rspack/core').Configuration} */
module.exports = {
  mode: 'development',
  entry: resolve(__dirname, 'src/main.js'),
  output: {
    path: resolve(__dirname, 'dist/rspack'),
    filename: 'main.js',
  },
  plugins: [rspack({ msg: 'Rspack' })],
  devtool: 'source-map',
}
