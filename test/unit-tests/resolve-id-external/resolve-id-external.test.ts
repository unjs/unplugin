import type { VitePlugin } from 'unplugin'
import * as path from 'node:path'
import { createUnplugin } from 'unplugin'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { build, toArray } from '../utils'

const entryFilePath = path.resolve(__dirname, './test-src/entry.js')
const externals = ['node:path']

describe('load hook should not be called when resolveId hook returned `external: true`', () => {
  const mockResolveIdHook = vi.fn((id: string) => {
    if (id === 'external-module') {
      return {
        id,
        external: true,
      }
    }
    else {
      return null
    }
  })
  const mockLoadHook = vi.fn(() => undefined)

  function createMockedUnplugin() {
    return createUnplugin(() => ({
      name: 'test-plugin',
      resolveId: mockResolveIdHook,
      load: mockLoadHook,
    }))
  }
  // We extract this check because all bundlers should behave the same
  function checkHookCalls(): void {
    expect(mockResolveIdHook).toHaveBeenCalledTimes(3)
    expect(mockResolveIdHook).toHaveBeenCalledWith(entryFilePath, undefined, expect.anything())
    expect(mockResolveIdHook).toHaveBeenCalledWith('./internal-module.js', expect.anything(), expect.anything())
    expect(mockResolveIdHook).toHaveBeenCalledWith('external-module', expect.anything(), expect.anything())

    const isVite = expect.getState().currentTestName?.includes('vite')
    expect(mockLoadHook).toHaveBeenCalledTimes(2)
    expect(mockLoadHook).toHaveBeenCalledWith(
      expect.stringMatching(/(?:\/|\\)entry\.js$/),
      ...(isVite ? [expect.anything()] : []),
    )
    expect(mockLoadHook).toHaveBeenCalledWith(
      expect.stringMatching(/(?:\/|\\)internal-module\.js$/),
      ...(isVite ? [expect.anything()] : []),
    )
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('vite', async () => {
    const plugin = createMockedUnplugin().vite

    // we need to define `enforce` here for the plugin to be run
    const plugins = toArray(plugin()).map((plugin): VitePlugin => ({ ...plugin, enforce: 'pre' }))
    await build.vite({
      clearScreen: false,
      plugins: [plugins],
      build: {
        lib: {
          entry: entryFilePath,
          name: 'TestLib',
        },
        rollupOptions: {
          external: externals,
        },
        write: false, // don't output anything
      },
    })

    checkHookCalls()
  })

  it('rollup', async () => {
    const plugin = createMockedUnplugin().rollup

    await build.rollup({
      input: entryFilePath,
      plugins: [plugin()],
      external: externals,
    })

    checkHookCalls()
  })

  it('webpack', async () => {
    const plugin = createMockedUnplugin().webpack

    await new Promise<void>((resolve) => {
      build.webpack(
        {
          entry: entryFilePath,
          plugins: [plugin()],
          externals,
          mode: 'production',
          target: 'node', // needed for webpack 4 so it doesn't try to "browserify" any node externals and load addtional modules
        },
        () => {
          resolve()
        },
      )
    })

    checkHookCalls()
  })

  it('rspack', async () => {
    const plugin = createMockedUnplugin().rspack

    await new Promise<void>((resolve) => {
      build.rspack(
        {
          entry: entryFilePath,
          plugins: [plugin()],
          externals,
          mode: 'production',
          target: 'node',
        },
        () => {
          resolve()
        },
      )
    })

    checkHookCalls()
  })

  it('esbuild', async () => {
    const plugin = createMockedUnplugin().esbuild

    await build.esbuild({
      entryPoints: [entryFilePath],
      plugins: [plugin()],
      bundle: true, // actually traverse imports
      write: false, // don't pollute console
      external: externals,
    })

    checkHookCalls()
  })
})
