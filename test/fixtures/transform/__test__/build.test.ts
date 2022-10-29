import { resolve } from 'path'
import fs from 'fs-extra'
import { describe, expect, it } from 'vitest'

const r = (...args: string[]) => resolve(__dirname, '../dist', ...args)

describe('transform build', () => {
  it('vite', async () => {
    const content = await fs.readFile(r('vite/main.js.mjs'), 'utf-8')

    expect(content).toContain('NON-TARGET: __UNPLUGIN__')
    expect(content).toContain('TARGET: [Injected Post Vite]')
    expect(content).toContain('QUERY: [Injected Post Vite]')
  })

  it('rollup', async () => {
    const content = await fs.readFile(r('rollup/main.js'), 'utf-8')

    expect(content).toContain('NON-TARGET: __UNPLUGIN__')
    expect(content).toContain('TARGET: [Injected Post Rollup]')
  })

  it('webpack', async () => {
    const content = await fs.readFile(r('webpack/main.js'), 'utf-8')

    expect(content).toContain('NON-TARGET: __UNPLUGIN__')
    expect(content).toContain('TARGET: [Injected Post Webpack]')
    expect(content).toContain('QUERY: [Injected Post Webpack]')
  })

  // TODO: esbuild not yet support nested transform
  it.fails('esbuild', async () => {
    const content = await fs.readFile(r('esbuild/main.js'), 'utf-8')

    expect(content).toContain('NON-TARGET: __UNPLUGIN__')
    expect(content).toContain('TARGET: [Injected Post Esbuild]')
    expect(content).toContain('QUERY: [Injected Post Esbuild]')
  })
})
