import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

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

  it('rspack', async () => {
    const content = await fs.readFile(r('rspack/main.js'), 'utf-8')

    expect(content).toContain('VIRTUAL:ONE')
    expect(content).toContain('VIRTUAL:TWO')
  })

  it('esbuild', async () => {
    const content = await fs.readFile(r('esbuild/main.js'), 'utf-8')

    expect(content).toContain('VIRTUAL:ONE')
    expect(content).toContain('VIRTUAL:TWO')
  })

  it('farm', async () => {
    const content = await fs.readFile(r('farm/main.js'), 'utf-8')

    expect(content).toContain('VIRTUAL:ONE')
    expect(content).toContain('VIRTUAL:TWO')
  })

  it('bun', async () => {
    const content = await fs.readFile(r('bun/main.js'), 'utf-8')

    expect(content).toContain('VIRTUAL:ONE')
    expect(content).toContain('VIRTUAL:TWO')
  })
})
