import type { UnpluginBuildContext, UnpluginContext, UnpluginOptions, VitePlugin } from 'unplugin'
import type { Mock } from 'vitest'
import * as path from 'node:path'
import { createUnplugin } from 'unplugin'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { build, toArray } from '../utils'

function createUnpluginWithCallback(resolveIdCallback: UnpluginOptions['resolveId']) {
  return createUnplugin(() => ({
    name: 'test-plugin',
    resolveId: resolveIdCallback,
  }))
}

// We extract this check because all bundlers should behave the same
const propsToTest: (keyof (UnpluginContext & UnpluginBuildContext))[] = ['addWatchFile', 'emitFile', 'getWatchFiles', 'parse', 'error', 'warn']

function createResolveIdHook(): Mock {
  const mockResolveIdHook = vi.fn(function (this: UnpluginContext & UnpluginBuildContext) {
    for (const prop of propsToTest) {
      expect(this).toHaveProperty(prop)
      expect(this[prop]).toBeInstanceOf(Function)
    }
  })
  return mockResolveIdHook
}

function checkResolveIdHook(resolveIdCallback: Mock): void {
  expect.assertions(4 * (1 + propsToTest.length * 2))

  expect(resolveIdCallback).toHaveBeenCalledWith(
    expect.stringMatching(/(?:\/|\\)entry\.js$/),
    undefined,
    expect.objectContaining({ isEntry: true }),
  )

  expect(resolveIdCallback).toHaveBeenCalledWith(
    './proxy-export',
    expect.stringMatching(/(?:\/|\\)entry\.js$/),
    expect.objectContaining({ isEntry: false }),
  )

  expect(resolveIdCallback).toHaveBeenCalledWith(
    './default-export',
    expect.stringMatching(/(?:\/|\\)proxy-export\.js$/),
    expect.objectContaining({ isEntry: false }),
  )

  expect(resolveIdCallback).toHaveBeenCalledWith(
    './named-export',
    expect.stringMatching(/(?:\/|\\)proxy-export\.js$/),
    expect.objectContaining({ isEntry: false }),
  )
}

describe('resolveId hook', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('vite', async () => {
    const mockResolveIdHook = createResolveIdHook()
    const plugin = createUnpluginWithCallback(mockResolveIdHook).vite
    // we need to define `enforce` here for the plugin to be run
    const plugins = toArray(plugin()).map((plugin): VitePlugin => ({ ...plugin, enforce: 'pre' }))

    await build.vite({
      clearScreen: false,
      plugins: [plugins],
      build: {
        lib: {
          entry: path.resolve(__dirname, 'test-src/entry.js'),
          name: 'TestLib',
        },
        write: false, // don't output anything
      },
    })

    checkResolveIdHook(mockResolveIdHook)
  })

  it('rollup', async () => {
    const mockResolveIdHook = createResolveIdHook()
    const plugin = createUnpluginWithCallback(mockResolveIdHook).rollup

    await build.rollup({
      input: path.resolve(__dirname, 'test-src/entry.js'),
      plugins: [plugin()],
    })

    checkResolveIdHook(mockResolveIdHook)
  })

  it('webpack', async () => {
    const mockResolveIdHook = createResolveIdHook()
    const plugin = createUnpluginWithCallback(mockResolveIdHook).webpack

    await new Promise((resolve) => {
      build.webpack(
        {
          entry: path.resolve(__dirname, 'test-src/entry.js'),
          plugins: [plugin()],
        },
        resolve,
      )
    })

    checkResolveIdHook(mockResolveIdHook)
  })

  it('rspack', async () => {
    const mockResolveIdHook = createResolveIdHook()
    const plugin = createUnpluginWithCallback(mockResolveIdHook).rspack

    await new Promise((resolve) => {
      build.rspack(
        {
          entry: path.resolve(__dirname, 'test-src/entry.js'),
          plugins: [plugin()],
        },
        resolve,
      )
    })

    checkResolveIdHook(mockResolveIdHook)
  })

  it('esbuild', async () => {
    const mockResolveIdHook = createResolveIdHook()
    const plugin = createUnpluginWithCallback(mockResolveIdHook).esbuild

    await build.esbuild({
      entryPoints: [path.resolve(__dirname, 'test-src/entry.js')],
      plugins: [plugin()],
      bundle: true, // actually traverse imports
      write: false, // don't pollute console
    })

    checkResolveIdHook(mockResolveIdHook)
  })
})
