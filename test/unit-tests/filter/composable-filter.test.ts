import type { UnpluginOptions, VitePlugin } from 'unplugin'
import * as path from 'node:path'
import { and, code, exclude, id, importerId, include, moduleType, not } from '@rolldown/pluginutils'
import { createUnplugin } from 'unplugin'
import { describe, expect, it, vi } from 'vitest'
import { onlyBun } from '../../utils'
import { build, runRspack, runWebpack, toArray } from '../utils'

const entry = path.resolve(__dirname, 'test-src/entry.js')

function createPlugin() {
  const resolveId = vi.fn()
  const load = vi.fn()
  const transform = vi.fn()
  const plugin = createUnplugin((): UnpluginOptions => ({
    name: 'test-plugin',
    resolveId: {
      filter: [
        include(and(id(/\.js$/), not(id(/not-expect/)), importerId(/entry\.js$/))),
      ],
      handler: resolveId,
    },
    load: {
      filter: [
        include(id(/\bmod\.js$/)),
      ],
      handler: load,
    },
    transform: {
      filter: [
        exclude(id(/entry\.js$/)),
        include(and(id(/\.js$/), code('42'))),
      ],
      handler: transform,
    },
  }))
  return { plugin, resolveId, load, transform }
}

type Hooks = ReturnType<typeof createPlugin>

function check({ resolveId, load, transform }: Hooks): void {
  expect(resolveId).toHaveBeenCalledTimes(1)
  expect(resolveId.mock.lastCall?.[0]).toMatch(/\bmod\.js$/)
  expect(load).toHaveBeenCalledTimes(1)
  expect(transform).toHaveBeenCalledTimes(1)
  expect(transform.mock.lastCall?.[1]).toMatch(/\bmod\.js$/)
}

describe('composable filter', () => {
  it('vite', async () => {
    const hooks = createPlugin()
    // we need to define `enforce` here for the plugin to be run
    const plugins = toArray(hooks.plugin.vite()).map((plugin): VitePlugin => ({ ...plugin, enforce: 'pre' }))
    await build.vite({
      clearScreen: false,
      plugins: [plugins],
      build: {
        lib: {
          entry,
          name: 'TestLib',
          formats: ['es'],
        },
        write: false,
      },
    })
    check(hooks)
  })

  it('rollup', async () => {
    const hooks = createPlugin()
    await build.rollup({
      input: entry,
      plugins: [
        hooks.plugin.rollup(),
      ],
    })
    check(hooks)
  })

  it('rolldown', async () => {
    const hooks = createPlugin()
    await build.rolldown({
      input: entry,
      plugins: [
        hooks.plugin.rolldown(),
      ],
    })
    check(hooks)
  })

  it('webpack', async () => {
    const hooks = createPlugin()
    await runWebpack({
      entry,
      plugins: [
        hooks.plugin.webpack(),
      ],
    })
    check(hooks)
  })

  it('rspack', async () => {
    const hooks = createPlugin()
    await runRspack({
      entry,
      plugins: [
        hooks.plugin.rspack(),
      ],
    })
    check(hooks)
  })

  it('esbuild', async () => {
    const hooks = createPlugin()
    await build.esbuild({
      entryPoints: [entry],
      plugins: [
        hooks.plugin.esbuild(),
      ],
      bundle: true,
      write: false,
    })
    check(hooks)
  })

  onlyBun('bun', async () => {
    const hooks = createPlugin()
    await build.bun({
      entrypoints: [entry],
      plugins: [
        hooks.plugin.bun(),
      ],
      outdir: path.resolve(__dirname, 'test-out/bun'),
    })
    check(hooks)
  })

  describe('moduleType', () => {
    function createModuleTypePlugin() {
      const transform = vi.fn()
      const plugin = createUnplugin((): UnpluginOptions => ({
        name: 'test-plugin',
        transform: {
          filter: [
            include(moduleType('js')),
          ],
          handler: transform,
        },
      }))
      return { plugin, transform }
    }

    it('is evaluated natively by rolldown', async () => {
      const { plugin, transform } = createModuleTypePlugin()
      await build.rolldown({
        input: entry,
        plugins: [
          plugin.rolldown(),
        ],
      })
      expect(transform.mock.calls.map(([, id]) => id)).toContain(path.resolve(__dirname, 'test-src/mod.js'))
    })

    it('throws on bundlers without module types', () => {
      const { plugin } = createModuleTypePlugin()
      expect(() => plugin.rollup()).toThrow('`moduleType` filter expressions are only supported by Rolldown')
    })
  })
})
