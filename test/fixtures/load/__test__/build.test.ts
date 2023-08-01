import { resolve } from 'path'
import fs from 'fs-extra'
import { describe, expect, it } from 'vitest'

const r = (...args: string[]) => resolve(__dirname, '../dist', ...args)

describe('load-called-before-transform', () => {
  it('vite', async () => {
    const content = await fs.readFile(r('vite/main.js.mjs'), 'utf-8')
    expect(content).toContain('load:VIRTUAL:ONE->transform-[Injected Vite]')
  })

  it('rollup', async () => {
    const content = await fs.readFile(r('rollup/main.js'), 'utf-8')

    expect(content).toContain('load:VIRTUAL:ONE->transform-[Injected Rollup]')
  })

  it('webpack', async () => {
    const content = await fs.readFile(r('webpack/main.js'), 'utf-8')

    expect(content).toContain('load:VIRTUAL:ONE->transform-[Injected Webpack]')
  })

  // TODO: esbuild not yet support nested transform
  it.fails('esbuild', async () => {
    const content = await fs.readFile(r('esbuild/main.js'), 'utf-8')

    expect(content).toContain('NON-TARGET: __UNPLUGIN__')
  })

  // it.skipIf(process.env.SKIP_RSPACK === 'true')('rspack', async () => {
  //   const content = await fs.readFile(r('rspack/main.js'), 'utf-8')

  //   expect(content).toContain('NON-TARGET: __UNPLUGIN__')
  //   expect(content).toContain('TARGET: [Injected Post Rspack]')
  //   expect(content).toContain('QUERY: [Injected Post Rspack]')
  // })
})
