// @ts-check
const antfu = require('@antfu/eslint-config').default

module.exports = antfu(
  {
    ignores: [
      'test-out/**',
      '**/output.js',
      'docs/showcase/*.md',
      'docs/.vitepress/data/repository.json',
    ],
  },
  {
    files: ['**/fixtures/**/*.js'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    rules: {
      'node/prefer-global/process': 'off',
      'unicorn/prefer-node-protocol': 'off',
    },
  },
  {
    files: ['**/src/**/*.ts'],
    rules: {
      'node/no-unsupported-features/node-builtins': 'error',
      'node/no-unsupported-features/es-builtins': 'error',
    },
  },
)
