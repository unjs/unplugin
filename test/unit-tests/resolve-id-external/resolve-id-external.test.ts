import * as path from 'path'
import { it, describe, expect, vi, afterEach } from 'vitest'
import * as vite from 'vite'
import * as rollup from 'rollup'
import { webpack } from 'webpack'
import * as esbuild from 'esbuild'
import { createUnplugin } from '../../../src'

const entryFilePath = path.resolve(__dirname, './test-src/entry.js')

describe('load hook should not be called when resolveId hook returned `external: true`', () => {
  const mockResolveIdHook = vi.fn((id: string) => {
    if (id === 'external-module') {
      return {
        id,
        external: true
      }
    } else {
      return null
    }
  })
  const mockLoadHook = vi.fn(() => undefined)

  function createMockedUnplugin () {
    return createUnplugin(() => ({
      name: 'test-plugin',
      resolveId: mockResolveIdHook,
      load: mockLoadHook
    }))
  }
  // We extract this check because all bundlers should behave the same
  function checkHookCalls (): void {
    expect(mockResolveIdHook).toHaveBeenCalledTimes(3)
    expect(mockResolveIdHook).toHaveBeenCalledWith(entryFilePath, undefined, expect.anything())
    expect(mockResolveIdHook).toHaveBeenCalledWith('./internal-module.js', expect.anything(), expect.anything())
    expect(mockResolveIdHook).toHaveBeenCalledWith('external-module', expect.anything(), expect.anything())

    expect(mockLoadHook).toHaveBeenCalledTimes(2)
    expect(mockLoadHook).toHaveBeenCalledWith(expect.stringMatching(/(?:\/|\\)entry\.js$/))
    expect(mockLoadHook).toHaveBeenCalledWith(expect.stringMatching(/(?:\/|\\)internal-module\.js$/))
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('vite', async () => {
    const plugin = createMockedUnplugin().vite

    await vite.build({
      clearScreen: false,
      plugins: [{ ...plugin(), enforce: 'pre' }], // we need to define `enforce` here for the plugin to be run
      build: {
        lib: {
          entry: entryFilePath,
          name: 'TestLib'
        },
        rollupOptions: {
          external: ['path']
        },
        write: false // don't output anything
      }
    })

    checkHookCalls()
  })

  it('rollup', async () => {
    const plugin = createMockedUnplugin().rollup

    await rollup.rollup({
      input: entryFilePath,
      plugins: [plugin()],
      external: ['path']
    })

    checkHookCalls()
  })

  it('webpack', async () => {
    const plugin = createMockedUnplugin().webpack

    await new Promise<void>((resolve) => {
      webpack(
        {
          entry: entryFilePath,
          plugins: [plugin()],
          externals: ['path'],
          mode: 'production'
        },
        () => {
          resolve()
        }
      )
    })

    checkHookCalls()
  })

  it('esbuild', async () => {
    const plugin = createMockedUnplugin().esbuild

    await esbuild.build({
      entryPoints: [entryFilePath],
      plugins: [plugin()],
      bundle: true, // actually traverse imports
      write: false, // don't pollute console
      external: ['path']
    })

    checkHookCalls()
  })
})
