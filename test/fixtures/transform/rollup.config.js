const { rollup } = require('./unplugin')

export default {
  input: './src/main.js',
  output: {
    dir: './dist/rollup',
    sourcemap: true
  },
  plugins: [
    rollup({ msg: 'Rollup' })
  ]
}
