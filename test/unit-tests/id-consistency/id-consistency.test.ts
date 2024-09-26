import type { UnpluginOptions, VitePlugin } from 'unplugin'
import type { Mock } from 'vitest'
import * as path from 'path'
import { createUnplugin } from 'unplugin'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { build, toArray } from '../utils'

const entryFilePath = path.resolve(__dirname, './test-src/entry.js')
const externals = ['path']

function createUnpluginWithCallback(
  resolveIdCallback: UnpluginOptions['resolveId'],
  transformIncludeCallback: UnpluginOptions['transformInclude'],
  transformCallback: UnpluginOptions['transform'],
  loadCallback: UnpluginOptions['load'],
) {
  return createUnplugin(() => ({
    name: 'test-plugin',
    resolveId: resolveIdCallback,
    transformInclude: transformIncludeCallback,
    transform: transformCallback,
    load: loadCallback,
  }))
}

// We extract this check because all bundlers should behave the same
function checkHookCalls(
  name: 'webpack' | 'rollup' | 'vite' | 'rspack' | 'esbuild',
  resolveIdCallback: Mock,
  transformIncludeCallback: Mock,
  transformCallback: Mock,
  loadCallback: Mock,
): void {
  const EXPECT_CALLED_TIMES = 4
  // Ensure that all bundlers call the hooks the same amount of times
  expect(resolveIdCallback).toHaveBeenCalledTimes(EXPECT_CALLED_TIMES)
  expect(transformIncludeCallback).toHaveBeenCalledTimes(EXPECT_CALLED_TIMES)
  expect(transformCallback).toHaveBeenCalledTimes(EXPECT_CALLED_TIMES)
  expect(loadCallback).toHaveBeenCalledTimes(EXPECT_CALLED_TIMES)

  // Ensure that each hook was called with unique ids
  expect(new Set(resolveIdCallback.mock.calls.map(call => call[0]))).toHaveLength(EXPECT_CALLED_TIMES)
  expect(new Set(transformIncludeCallback.mock.calls.map(call => call[0]))).toHaveLength(EXPECT_CALLED_TIMES)
  expect(new Set(transformCallback.mock.calls.map(call => call[1]))).toHaveLength(EXPECT_CALLED_TIMES)
  expect(new Set(loadCallback.mock.calls.map(call => call[0]))).toHaveLength(EXPECT_CALLED_TIMES)

  // Ensure that the `resolveId` hook was called with expected values
  expect(resolveIdCallback).toHaveBeenCalledWith(entryFilePath, undefined, expect.anything())
  expect(resolveIdCallback).toHaveBeenCalledWith('./proxy-export', expect.anything(), expect.anything())
  expect(resolveIdCallback).toHaveBeenCalledWith('./sub-folder/named-export', expect.anything(), expect.anything())
  expect(resolveIdCallback).toHaveBeenCalledWith('./default-export', expect.anything(), expect.anything())

  // Ensure that the `transformInclude`, `transform` and `load` hooks were called with the same (absolute) ids
  const ids = transformIncludeCallback.mock.calls.map(call => call[0])
  ids.forEach((id) => {
    expect(path.isAbsolute(id)).toBe(true)
    expect(transformCallback).toHaveBeenCalledWith(expect.anything(), id)
    expect(loadCallback).toHaveBeenCalledWith(id)
  })
}

describe('id parameter should be consistent across hooks and plugins', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('vite', async () => {
    const mockResolveIdHook = vi.fn(() => undefined)
    const mockTransformIncludeHook = vi.fn(() => true)
    const mockTransformHook = vi.fn(() => undefined)
    const mockLoadHook = vi.fn(() => undefined)

    const plugin = createUnpluginWithCallback(
      mockResolveIdHook,
      mockTransformIncludeHook,
      mockTransformHook,
      mockLoadHook,
    ).vite
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

    checkHookCalls('vite', mockResolveIdHook, mockTransformIncludeHook, mockTransformHook, mockLoadHook)
  })

  it('rollup', async () => {
    const mockResolveIdHook = vi.fn(() => undefined)
    const mockTransformIncludeHook = vi.fn(() => true)
    const mockTransformHook = vi.fn(() => undefined)
    const mockLoadHook = vi.fn(() => undefined)

    const plugin = createUnpluginWithCallback(
      mockResolveIdHook,
      mockTransformIncludeHook,
      mockTransformHook,
      mockLoadHook,
    ).rollup

    await build.rollup({
      input: entryFilePath,
      plugins: [plugin()],
      external: externals,
    })

    checkHookCalls('rollup', mockResolveIdHook, mockTransformIncludeHook, mockTransformHook, mockLoadHook)
  })

  it('webpack', async () => {
    const mockResolveIdHook = vi.fn(() => undefined)
    const mockTransformIncludeHook = vi.fn(() => true)
    const mockTransformHook = vi.fn(() => undefined)
    const mockLoadHook = vi.fn(() => undefined)

    const plugin = createUnpluginWithCallback(
      mockResolveIdHook,
      mockTransformIncludeHook,
      mockTransformHook,
      mockLoadHook,
    ).webpack

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

    checkHookCalls('webpack', mockResolveIdHook, mockTransformIncludeHook, mockTransformHook, mockLoadHook)
  })

  it('rspack', async () => {
    const mockResolveIdHook = vi.fn(() => undefined)
    const mockTransformIncludeHook = vi.fn(() => true)
    const mockTransformHook = vi.fn(() => undefined)
    const mockLoadHook = vi.fn(() => undefined)

    const plugin = createUnpluginWithCallback(
      mockResolveIdHook,
      mockTransformIncludeHook,
      mockTransformHook,
      mockLoadHook,
    ).rspack

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

    checkHookCalls('rspack', mockResolveIdHook, mockTransformIncludeHook, mockTransformHook, mockLoadHook)
  })

  it('esbuild', async () => {
    const mockResolveIdHook = vi.fn(() => undefined)
    const mockTransformIncludeHook = vi.fn(() => true)
    const mockTransformHook = vi.fn(() => undefined)
    const mockLoadHook = vi.fn(() => undefined)

    const plugin = createUnpluginWithCallback(
      mockResolveIdHook,
      mockTransformIncludeHook,
      mockTransformHook,
      mockLoadHook,
    ).esbuild

    await build.esbuild({
      entryPoints: [entryFilePath],
      plugins: [plugin()],
      bundle: true, // actually traverse imports
      write: false, // don't pollute console
      external: externals,
    })

    checkHookCalls('esbuild', mockResolveIdHook, mockTransformIncludeHook, mockTransformHook, mockLoadHook)
  })
})
