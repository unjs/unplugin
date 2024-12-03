import { resolve } from 'node:path'
import fs from 'fs-extra'
import { describe, expect, it } from 'vitest'

const r = (...args: string[]) => resolve(__dirname, '../dist', ...args)

describe('load-called-before-transform', () => {
  it('vite', async () => {
    const content = await fs.readFile(r('vite/main.js.mjs'), 'utf-8')
    expect(content).toContain('it is a msg -> through the load hook -> transform-[Injected Vite]')
  })

  it('rollup', async () => {
    const content = await fs.readFile(r('rollup/main.js'), 'utf-8')

    expect(content).toContain('it is a msg -> through the load hook -> transform-[Injected Rollup]')
  })

  it('webpack', async () => {
    const content = await fs.readFile(r('webpack/main.js'), 'utf-8')

    expect(content).toContain('it is a msg -> through the load hook -> transform-[Injected Webpack]')
  })

  it('esbuild', async () => {
    const content = await fs.readFile(r('esbuild/main.js'), 'utf-8')
    expect(content).toContain('it is a msg -> through the load hook -> transform-[Injected Esbuild]')
  })

  it('rspack', async () => {
    const content = await fs.readFile(r('rspack/main.js'), 'utf-8')

    expect(content).toContain('it is a msg -> through the load hook -> transform-[Injected Rspack]')
  })

  it('farm', async () => {
    const content = await fs.readFile(r('farm/main.js'), 'utf-8')

    expect(content).toContain('it is a msg -> through the load hook -> transform-[Injected Farm]')
  })
})
