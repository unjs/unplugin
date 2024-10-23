import type { UnpluginOptions, VitePlugin } from 'unplugin'
import type { Mock } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { createUnplugin } from 'unplugin'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { build, toArray } from '../utils'

function createUnpluginWithCallbacks(resolveIdCallback: UnpluginOptions['resolveId'], loadCallback: UnpluginOptions['load']) {
  return createUnplugin(() => ({
    name: 'test-plugin',
    resolveId: resolveIdCallback,
    load: loadCallback,
  }))
}

function createResolveIdHook(): Mock {
  const mockResolveIdHook = vi.fn((id: string, importer: string | undefined): string => {
    // rspack seems to generate paths of the form \C:\... on Windows.
    // Remove the leading \
    if (importer && /^\\[A-Z]:\\/.test(importer))
      importer = importer.slice(1)
    id = path.resolve(path.dirname(importer ?? ''), id)
    return `${id}.js`
  })
  return mockResolveIdHook
}

function createLoadHook(): Mock {
  const mockLoadHook = vi.fn((id: string): string => {
    expect(id).toMatch(/\.js\.js$/)
    id = id.slice(0, -3)
    return fs.readFileSync(id, { encoding: 'utf-8' })
  })
  return mockLoadHook
}

function checkResolveIdHook(resolveIdCallback: Mock): void {
  expect(resolveIdCallback).toHaveBeenCalledWith(
    expect.stringMatching(/(?:\/|\\)entry\.js$/),
    undefined,
    expect.objectContaining({ isEntry: true }),
  )

  expect(resolveIdCallback).toHaveBeenCalledWith(
    './imported.js',
    expect.stringMatching(/(?:\/|\\)entry\.js\.js$/),
    expect.objectContaining({ isEntry: false }),
  )
}

function checkLoadHook(loadCallback: Mock): void {
  expect(loadCallback).toHaveBeenCalledWith(
    expect.stringMatching(/(?:\/|\\)entry\.js\.js$/),
  )

  expect(loadCallback).toHaveBeenCalledWith(
    expect.stringMatching(/(?:\/|\\)imported\.js\.js$/),
  )
}

describe('virtual ids', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('vite', async () => {
    const mockResolveIdHook = createResolveIdHook()
    const mockLoadHook = createLoadHook()
    const plugin = createUnpluginWithCallbacks(mockResolveIdHook, mockLoadHook).vite
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
    checkLoadHook(mockLoadHook)
  })

  it('rollup', async () => {
    const mockResolveIdHook = createResolveIdHook()
    const mockLoadHook = createLoadHook()
    const plugin = createUnpluginWithCallbacks(mockResolveIdHook, mockLoadHook).rollup

    await build.rollup({
      input: path.resolve(__dirname, 'test-src/entry.js'),
      plugins: [plugin()],
    })

    checkResolveIdHook(mockResolveIdHook)
    checkLoadHook(mockLoadHook)
  })

  it('webpack', async () => {
    const mockResolveIdHook = createResolveIdHook()
    const mockLoadHook = createLoadHook()
    const plugin = createUnpluginWithCallbacks(mockResolveIdHook, mockLoadHook).webpack

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
    checkLoadHook(mockLoadHook)
  })

  it('rspack', async () => {
    const mockResolveIdHook = createResolveIdHook()
    const mockLoadHook = createLoadHook()
    const plugin = createUnpluginWithCallbacks(mockResolveIdHook, mockLoadHook).rspack

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
    checkLoadHook(mockLoadHook)
  })

  it('esbuild', async () => {
    const mockResolveIdHook = createResolveIdHook()
    const mockLoadHook = createLoadHook()
    const plugin = createUnpluginWithCallbacks(mockResolveIdHook, mockLoadHook).esbuild

    await build.esbuild({
      entryPoints: [path.resolve(__dirname, 'test-src/entry.js')],
      plugins: [plugin()],
      bundle: true, // actually traverse imports
      write: false, // don't pollute console
    })

    checkResolveIdHook(mockResolveIdHook)
    checkLoadHook(mockLoadHook)
  })
})
