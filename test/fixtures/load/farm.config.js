const { farm } = require('./unplugin')

/**
 * @type {import('@farmfe/core').UserConfig}
 */
module.exports = {
  compilation: {
    input: {
      index: './src/main.js',
    },
    output: {
      path: './dist/farm',
      targetEnv: 'node',
      format: 'cjs',
    },
  },
  plugins: [
    farm({ msg: 'Farm' }),
  ],
}
