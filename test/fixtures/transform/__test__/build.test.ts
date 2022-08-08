import { resolve } from 'pathe'
import fs from 'fs-extra'
import { describe, it, expect } from 'vitest'

const r = (...args: string[]) => resolve(__dirname, '../dist', ...args)

describe('transform build', () => {
  it('vite', async () => {
    const content = await fs.readFile(r('vite/main.js.mjs'), 'utf-8')

    expect(content).toContain('NON-TARGET: __UNPLUGIN__')
    expect(content).toContain('TARGET: [Injected Vite]')
    expect(content).toContain('QUERY: [Injected Vite]')
  })

  it('rollup', async () => {
    const content = await fs.readFile(r('rollup/main.js'), 'utf-8')

    expect(content).toContain('NON-TARGET: __UNPLUGIN__')
    expect(content).toContain('TARGET: [Injected Rollup]')
  })

  it('webpack', async () => {
    const content = await fs.readFile(r('webpack/main.js'), 'utf-8')

    expect(content).toContain('NON-TARGET: __UNPLUGIN__')
    expect(content).toContain('TARGET: [Injected Webpack]')
    expect(content).toContain('QUERY: [Injected Webpack]')
  })

  it('esbuild', async () => {
    const content = await fs.readFile(r('esbuild/main.js'), 'utf-8')

    expect(content).toContain('NON-TARGET: __UNPLUGIN__')
    expect(content).toContain('TARGET: [Injected Esbuild]')
    expect(content).toContain('QUERY: [Injected Esbuild]')
  })
})
