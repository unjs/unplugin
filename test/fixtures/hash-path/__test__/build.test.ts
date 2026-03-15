import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { onlyBun } from '../../../utils'

const r = (...args: string[]) => resolve(__dirname, '../dist', ...args)
const expected = 'it is a msg -> through the load hook -> transform#hash'

describe('hash-path hooks', () => {
  it('vite', async () => {
    const content = await fs.readFile(r('vite/main.js.mjs'), 'utf-8')
    expect(content).toContain(expected)
  })

  it('rollup', async () => {
    const content = await fs.readFile(r('rollup/main.js'), 'utf-8')
    expect(content).toContain(expected)
  })

  it('webpack', async () => {
    const content = await fs.readFile(r('webpack/main.js'), 'utf-8')
    expect(content).toContain(expected)
  })

  it('esbuild', async () => {
    const content = await fs.readFile(r('esbuild/main.js'), 'utf-8')
    expect(content).toContain(expected)
  })

  it('rspack', async () => {
    const content = await fs.readFile(r('rspack/main.js'), 'utf-8')
    expect(content).toContain(expected)
  })

  it('farm', async () => {
    const content = await fs.readFile(r('farm/main.js'), 'utf-8')
    expect(content).toContain(expected)
  })

  onlyBun('bun', async () => {
    const content = await fs.readFile(r('bun/main.js'), 'utf-8')
    expect(content).toContain(expected)
  })
})
