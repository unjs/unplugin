const { resolve } = require('path')
const { rspack } = require('./unplugin')

module.exports = {
  mode: 'development',
  entry: resolve(__dirname, 'src/main.js'),
  output: {
    path: resolve(__dirname, 'dist/rspack'),
    filename: 'main.js',
  },
  plugins: [
    rspack(),
  ],
}
