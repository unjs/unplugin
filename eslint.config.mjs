// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
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
      'node/no-unsupported-features/node-builtins': 'warn',
      'node/no-unsupported-features/es-builtins': 'error',
    },
  },
)
