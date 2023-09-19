const { builtinModules } = require('module')
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
    external: [
      ...builtinModules.map(m => `^${m}$`),
      ...builtinModules.map(m => `^node:${m}$`),
    ],
    partialBundling: {
      moduleBuckets: [
        {
          name: 'node.bundle.js',
          test: ['.+'],
        },
      ],
    },
    presetEnv: false,
  },
  plugins: [
    farm({ msg: 'Farm' }),
  ],
}
