const { rollup } = require('./unplugin')

export default {
  input: './src/main.js',
  output: {
    dir: './dist/rollup'
  },
  plugins: [
    rollup()
  ]
}
