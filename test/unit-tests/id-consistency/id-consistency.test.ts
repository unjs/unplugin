import * as path from 'path'
import { it, describe, expect, vi, afterEach, Mock } from 'vitest'
import { createUnplugin, UnpluginOptions } from '../../../src'
import { build } from '../utils'

const entryFilePath = path.resolve(__dirname, './test-src/entry.js')

function createUnpluginWithCallback (
  resolveIdCallback: UnpluginOptions['resolveId'],
  transformIncludeCallback: UnpluginOptions['transformInclude'],
  transformCallback: UnpluginOptions['transform'],
  loadCallback: UnpluginOptions['load']
) {
  return createUnplugin(() => ({
    name: 'test-plugin',
    resolveId: resolveIdCallback,
    transformInclude: transformIncludeCallback,
    transform: transformCallback,
    load: loadCallback
  }))
}

// We extract this check because all bundlers should behave the same
function checkHookCalls (
  resolveIdCallback: Mock,
  transformIncludeCallback: Mock,
  transformCallback: Mock,
  loadCallback: Mock
): void {
  // Ensure that all bundlers call the hooks the same amount of times
  expect(resolveIdCallback).toHaveBeenCalledTimes(4)
  expect(transformIncludeCallback).toHaveBeenCalledTimes(4)
  expect(transformCallback).toHaveBeenCalledTimes(4)
  expect(loadCallback).toHaveBeenCalledTimes(4)

  // Ensure that each hook was called with 4 unique ids
  expect(new Set(resolveIdCallback.mock.calls.map(call => call[0]))).toHaveLength(4)
  expect(new Set(transformIncludeCallback.mock.calls.map(call => call[0]))).toHaveLength(4)
  expect(new Set(transformCallback.mock.calls.map(call => call[1]))).toHaveLength(4)
  expect(new Set(loadCallback.mock.calls.map(call => call[0]))).toHaveLength(4)

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

describe('id parameter should be consistent accross hooks and plugins', () => {
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
      mockLoadHook
    ).vite

    await build.vite({
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

    checkHookCalls(mockResolveIdHook, mockTransformIncludeHook, mockTransformHook, mockLoadHook)
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
      mockLoadHook
    ).rollup

    await build.rollup({
      input: entryFilePath,
      plugins: [plugin()],
      external: ['path']
    })

    checkHookCalls(mockResolveIdHook, mockTransformIncludeHook, mockTransformHook, mockLoadHook)
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
      mockLoadHook
    ).webpack

    await new Promise<void>((resolve) => {
      build.webpack(
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

    checkHookCalls(mockResolveIdHook, mockTransformIncludeHook, mockTransformHook, mockLoadHook)
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
      mockLoadHook
    ).esbuild

    await build.esbuild({
      entryPoints: [entryFilePath],
      plugins: [plugin()],
      bundle: true, // actually traverse imports
      write: false, // don't pollute console
      external: ['path']
    })

    checkHookCalls(mockResolveIdHook, mockTransformIncludeHook, mockTransformHook, mockLoadHook)
  })
})
