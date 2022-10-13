import * as path from 'path'
import { it, describe, expect, vi, afterEach, Mock } from 'vitest'
import { toArray } from '@antfu/utils'
import { build } from '../utils'
import { createUnplugin, UnpluginOptions, VitePlugin } from 'unplugin'

function createUnpluginWithCallback (resolveIdCallback: UnpluginOptions['resolveId']) {
  return createUnplugin(() => ({
    name: 'test-plugin',
    resolveId: resolveIdCallback
  }))
}

// We extract this check because all bundlers should behave the same
function checkResolveIdHook (resolveIdCallback: Mock): void {
  expect.assertions(4)

  expect(resolveIdCallback).toHaveBeenCalledWith(
    expect.stringMatching(/(?:\/|\\)entry\.js$/),
    undefined,
    expect.objectContaining({ isEntry: true })
  )

  expect(resolveIdCallback).toHaveBeenCalledWith(
    './proxy-export',
    expect.stringMatching(/(?:\/|\\)entry\.js$/),
    expect.objectContaining({ isEntry: false })
  )

  expect(resolveIdCallback).toHaveBeenCalledWith(
    './default-export',
    expect.stringMatching(/(?:\/|\\)proxy-export\.js$/),
    expect.objectContaining({ isEntry: false })
  )

  expect(resolveIdCallback).toHaveBeenCalledWith(
    './named-export',
    expect.stringMatching(/(?:\/|\\)proxy-export\.js$/),
    expect.objectContaining({ isEntry: false })
  )
}

describe('resolveId hook', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('vite', async () => {
    const mockResolveIdHook = vi.fn(() => undefined)
    const plugin = createUnpluginWithCallback(mockResolveIdHook).vite
    // we need to define `enforce` here for the plugin to be run
    const plugins = toArray(plugin()).map((plugin): VitePlugin => ({ ...plugin, enforce: 'pre' }))

    await build.vite({
      clearScreen: false,
      plugins: [plugins],
      build: {
        lib: {
          entry: path.resolve(__dirname, 'test-src/entry.js'),
          name: 'TestLib'
        },
        write: false // don't output anything
      }
    })

    checkResolveIdHook(mockResolveIdHook)
  })

  it('rollup', async () => {
    const mockResolveIdHook = vi.fn(() => undefined)
    const plugin = createUnpluginWithCallback(mockResolveIdHook).rollup

    await build.rollup({
      input: path.resolve(__dirname, 'test-src/entry.js'),
      plugins: [plugin()]
    })

    checkResolveIdHook(mockResolveIdHook)
  })

  it('webpack', async () => {
    const mockResolveIdHook = vi.fn(() => undefined)
    const plugin = createUnpluginWithCallback(mockResolveIdHook).webpack

    await new Promise((resolve) => {
      build.webpack(
        {
          entry: path.resolve(__dirname, 'test-src/entry.js'),
          plugins: [plugin()]
        },
        resolve
      )
    })

    checkResolveIdHook(mockResolveIdHook)
  })

  it('esbuild', async () => {
    const mockResolveIdHook = vi.fn(() => undefined)
    const plugin = createUnpluginWithCallback(mockResolveIdHook).esbuild

    await build.esbuild({
      entryPoints: [path.resolve(__dirname, 'test-src/entry.js')],
      plugins: [plugin()],
      bundle: true, // actually traverse imports
      write: false // don't pollute console
    })

    checkResolveIdHook(mockResolveIdHook)
  })
})
