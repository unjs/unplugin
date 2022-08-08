import { resolve } from 'pathe'
import fs from 'fs-extra'
import { describe, it, expect } from 'vitest'

const r = (...args: string[]) => resolve(__dirname, '../dist', ...args)

describe('virtual-module build', () => {
  it('vite', async () => {
    const content = await fs.readFile(r('vite/main.js.mjs'), 'utf-8')

    expect(content).toContain('VIRTUAL:ONE')
    expect(content).toContain('VIRTUAL:TWO')
  })

  it('rollup', async () => {
    const content = await fs.readFile(r('rollup/main.js'), 'utf-8')

    expect(content).toContain('VIRTUAL:ONE')
    expect(content).toContain('VIRTUAL:TWO')
  })

  it('webpack', async () => {
    const content = await fs.readFile(r('webpack/main.js'), 'utf-8')

    expect(content).toContain('VIRTUAL:ONE')
    expect(content).toContain('VIRTUAL:TWO')
  })

  it('esbuild', async () => {
    const content = await fs.readFile(r('esbuild/main.js'), 'utf-8')

    expect(content).toContain('VIRTUAL:ONE')
    expect(content).toContain('VIRTUAL:TWO')
  })
})
