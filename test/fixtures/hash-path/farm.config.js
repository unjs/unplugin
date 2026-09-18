const { farm } = require('./unplugin')

/**
 * @type {import('@farmfe/core').UserConfig}
 */
module.exports = {
  compilation: {
    persistentCache: false,
    input: {
      index: './src/main.js',
    },
    presetEnv: false,
    output: {
      entryFilename: 'main.[ext]',
      path: './dist/farm',
      targetEnv: 'node',
      format: 'cjs',
    },
  },
  plugins: [
    farm({ msg: 'Farm' }),
  ],
}
