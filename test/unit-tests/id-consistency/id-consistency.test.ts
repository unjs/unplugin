import * as path from 'path'
import { it, describe, expect, vi, afterEach, Mock } from 'vitest'
import * as vite from 'vite'
import * as rollup from 'rollup'
import { webpack } from 'webpack'
import * as esbuild from 'esbuild'
import { createUnplugin, UnpluginOptions } from '../../../src'

const entryFilePath = path.resolve(__dirname, './test-src/entry.js')
const proxyExportFilePath = path.resolve(__dirname, './test-src/proxy-export.js')
const defaultExportFilePath = path.resolve(__dirname, './test-src/default-export.js')
const namedExportFilePath = path.resolve(__dirname, './test-src/sub-folder/named-export.js')

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
  expect(resolveIdCallback).toHaveBeenCalledTimes(4)
  expect(resolveIdCallback).toHaveBeenCalledWith(entryFilePath, undefined, expect.anything())
  expect(resolveIdCallback).toHaveBeenCalledWith('./proxy-export', expect.anything(), expect.anything())
  expect(resolveIdCallback).toHaveBeenCalledWith('./sub-folder/named-export', expect.anything(), expect.anything())
  expect(resolveIdCallback).toHaveBeenCalledWith('./default-export', expect.anything(), expect.anything())

  expect(transformIncludeCallback).toHaveBeenCalledTimes(4)
  expect(transformIncludeCallback).toHaveBeenCalledWith(entryFilePath)
  expect(transformIncludeCallback).toHaveBeenCalledWith(proxyExportFilePath)
  expect(transformIncludeCallback).toHaveBeenCalledWith(namedExportFilePath)
  expect(transformIncludeCallback).toHaveBeenCalledWith(defaultExportFilePath)

  expect(transformCallback).toHaveBeenCalledTimes(4)
  expect(transformCallback).toHaveBeenCalledWith(expect.anything(), entryFilePath)
  expect(transformCallback).toHaveBeenCalledWith(expect.anything(), proxyExportFilePath)
  expect(transformCallback).toHaveBeenCalledWith(expect.anything(), namedExportFilePath)
  expect(transformCallback).toHaveBeenCalledWith(expect.anything(), defaultExportFilePath)

  expect(loadCallback).toHaveBeenCalledTimes(4)
  expect(loadCallback).toHaveBeenCalledWith(entryFilePath)
  expect(loadCallback).toHaveBeenCalledWith(proxyExportFilePath)
  expect(loadCallback).toHaveBeenCalledWith(namedExportFilePath)
  expect(loadCallback).toHaveBeenCalledWith(defaultExportFilePath)
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

    await vite.build({
      clearScreen: false,
      plugins: [{ ...plugin(), enforce: 'pre' }], // we need to define `enforce` here for the plugin to be run
      build: {
        lib: {
          entry: path.resolve(__dirname, 'test-src/entry.js'),
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

    await rollup.rollup({
      input: path.resolve(__dirname, 'test-src/entry.js'),
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
      webpack(
        {
          entry: path.resolve(__dirname, 'test-src/entry.js'),
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

    await esbuild.build({
      entryPoints: [path.resolve(__dirname, 'test-src/entry.js')],
      plugins: [plugin()],
      bundle: true, // actually traverse imports
      write: false, // don't pollute console
      external: ['path']
    })

    checkHookCalls(mockResolveIdHook, mockTransformIncludeHook, mockTransformHook, mockLoadHook)
  })
})
