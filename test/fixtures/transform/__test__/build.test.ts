import fs from 'node:fs/promises'
import { resolve } from 'node:path'
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
    // Query imports are external in Rollup
  })

  it('webpack', async () => {
    const content = await fs.readFile(r('webpack/main.js'), 'utf-8')

    expect(content).toContain('NON-TARGET: __UNPLUGIN__')
    expect(content).toContain('TARGET: [Injected Post Webpack]')
    expect(content).toContain('QUERY: [Injected Post Webpack]')
  })

  it('esbuild', async () => {
    const content = await fs.readFile(r('esbuild/main.js'), 'utf-8')

    expect(content).toContain('NON-TARGET: __UNPLUGIN__')
    expect(content).toContain('TARGET: [Injected Post Esbuild]')
    expect(content).toContain('QUERY: [Injected Post Esbuild]')
  })

  it('rspack', async () => {
    const content = await fs.readFile(r('rspack/main.js'), 'utf-8')

    expect(content).toContain('NON-TARGET: __UNPLUGIN__')
    expect(content).toContain('TARGET: [Injected Post Rspack]')
    expect(content).toContain('QUERY: [Injected Post Rspack]')
  })

  it('farm', async () => {
    const content = await fs.readFile(r('farm/main.js'), 'utf-8')

    expect(content).toContain('NON-TARGET: __UNPLUGIN__')
    expect(content).toContain('TARGET: [Injected Post Farm]')
    expect(content).toContain('QUERY: [Injected Post Farm]')
  })

  it('bun', async () => {
    const content = await fs.readFile(r('bun/main.js'), 'utf-8')

    expect(content).toContain('NON-TARGET: __UNPLUGIN__')
    expect(content).toContain('TARGET: [Injected Post Bun]')
    // Like Rollup, imports with query params are marked as external in Bun
  })
})
