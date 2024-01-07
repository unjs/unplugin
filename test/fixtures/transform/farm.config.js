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
      entryFilename: 'main.[ext]',
      targetEnv: 'node',
      format: 'cjs',
    },
    presetEnv: false,
  },
  plugins: [
    farm({ msg: 'Farm' }),
  ],
}
