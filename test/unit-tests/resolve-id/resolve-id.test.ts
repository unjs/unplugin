import * as path from 'path'
import { it, describe, expect, vi, afterEach } from 'vitest'
import * as vite from 'vite'
import * as rollup from 'rollup'
import { webpack } from 'webpack'
import * as esbuild from 'esbuild'
import { createUnplugin, UnpluginOptions } from '../../../src'

const createUnpluginWithcallback = (
  resolveIdCallback: UnpluginOptions['resolveId']
) => {
  return createUnplugin(() => ({
    name: 'test-plugin',
    resolveId: resolveIdCallback
  }))
}

// We extract this check because all bundlers should behave the same
function checkResolveIdHook (resolveIdCallback): void {
  expect.assertions(4)

  expect(resolveIdCallback).toHaveBeenCalledWith(
    expect.stringMatching(/\/entry\.js$/),
    undefined,
    expect.objectContaining({ isEntry: true })
  )

  expect(resolveIdCallback).toHaveBeenCalledWith(
    './proxy-export',
    expect.stringMatching(/\/entry\.js$/),
    expect.objectContaining({ isEntry: false })
  )

  expect(resolveIdCallback).toHaveBeenCalledWith(
    './default-export',
    expect.stringMatching(/\/proxy-export\.js$/),
    expect.objectContaining({ isEntry: false })
  )

  expect(resolveIdCallback).toHaveBeenCalledWith(
    './named-export',
    expect.stringMatching(/\/proxy-export\.js$/),
    expect.objectContaining({ isEntry: false })
  )
}

describe('resolveId hook', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('vite', async () => {
    const mockResolveIdHook = vi.fn(() => undefined)
    const plugin = createUnpluginWithcallback(mockResolveIdHook).vite

    await vite.build({
      clearScreen: false,
      plugins: [{ ...plugin(), enforce: 'pre' }], // we need to define `enforce` here for the plugin to be run
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
    const plugin = createUnpluginWithcallback(mockResolveIdHook).rollup

    await rollup.rollup({
      input: path.resolve(__dirname, 'test-src/entry.js'),
      plugins: [plugin()]
    })

    checkResolveIdHook(mockResolveIdHook)
  })

  it('webpack', async () => {
    const mockResolveIdHook = vi.fn(() => undefined)
    const plugin = createUnpluginWithcallback(mockResolveIdHook).webpack

    await new Promise((resolve) => {
      webpack(
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
    const plugin = createUnpluginWithcallback(mockResolveIdHook).esbuild

    await esbuild.build({
      entryPoints: [path.resolve(__dirname, 'test-src/entry.js')],
      plugins: [plugin()],
      bundle: true, // actually traverse imports
      write: false // don't pollute console
    })

    checkResolveIdHook(mockResolveIdHook)
  })
})
