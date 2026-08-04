import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { onlyBun } from '../../../utils'

const r = (...args: string[]) => resolve(__dirname, '../dist', ...args)
const expected = 'it is a msg -> through the load hook -> transform#hash'
const cases: Array<[string, string]> = [
  ['vite', 'vite/main.js.mjs'],
  ['rollup', 'rollup/main.js'],
  ['webpack', 'webpack/main.js'],
  ['esbuild', 'esbuild/main.js'],
  ['rspack', 'rspack/main.js'],
  ['farm', 'farm/main.js'],
]

describe('hash-path hooks', () => {
  for (const [name, file] of cases) {
    it(name, async () => {
      const content = await fs.readFile(r(file), 'utf-8')
      expect(content).toContain(expected)
    })
  }

  onlyBun('bun', async () => {
    const content = await fs.readFile(r('bun/main.js'), 'utf-8')
    expect(content).toContain(expected)
  })
})
