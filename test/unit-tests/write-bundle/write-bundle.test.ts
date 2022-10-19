import * as path from 'path'
import * as fs from 'fs'
import { it, describe, expect, vi, afterEach, Mock, beforeAll } from 'vitest'
import { build, toArray } from '../utils'
import { createUnplugin, UnpluginOptions, VitePlugin } from 'unplugin'

function createUnpluginWithCallback (writeBundleCallback: UnpluginOptions['writeBundle']) {
  return createUnplugin(() => ({
    name: 'test-plugin',
    writeBundle: writeBundleCallback
  }))
}

function generateMockWriteBundleHook (outputPath: string) {
  return () => {
    // We want to check that at the time the `writeBundle` hook is called, all
    // build-artifacts have already been written to disk.

    const bundleExists = fs.existsSync(path.join(outputPath, 'output.js'))
    const sourceMapExists = fs.existsSync(path.join(outputPath, 'output.js.map'))

    expect(bundleExists).toBe(true)
    expect(sourceMapExists).toBe(true)

    return undefined
  }
}

// We extract this check because all bundlers should behave the same
function checkWriteBundleHook (writeBundleCallback: Mock): void {
  expect(writeBundleCallback).toHaveBeenCalledOnce()
}

describe('writeBundle hook', () => {
  beforeAll(() => {
    fs.rmSync(path.resolve(__dirname, 'test-out'), { recursive: true, force: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('vite', async () => {
    expect.assertions(3)
    const mockWriteBundleHook = vi.fn(generateMockWriteBundleHook(path.resolve(__dirname, 'test-out/vite')))
    const plugin = createUnpluginWithCallback(mockWriteBundleHook).vite
    // we need to define `enforce` here for the plugin to be run
    const plugins = toArray(plugin()).map((plugin): VitePlugin => ({ ...plugin, enforce: 'pre' }))

    await build.vite({
      clearScreen: false,
      plugins: [plugins],
      build: {
        lib: {
          entry: path.resolve(__dirname, 'test-src/entry.js'),
          name: 'TestLib',
          fileName: 'output',
          formats: ['cjs']
        },
        outDir: path.resolve(__dirname, 'test-out/vite'),
        sourcemap: true
      }
    })

    checkWriteBundleHook(mockWriteBundleHook)
  })

  it('rollup', async () => {
    expect.assertions(3)
    const mockResolveIdHook = vi.fn(generateMockWriteBundleHook(path.resolve(__dirname, 'test-out/rollup')))
    const plugin = createUnpluginWithCallback(mockResolveIdHook).rollup

    const rollupBuild = await build.rollup({
      input: path.resolve(__dirname, 'test-src/entry.js')
    })

    await rollupBuild.write({
      plugins: [plugin()],
      file: path.resolve(__dirname, 'test-out/rollup/output.js'),
      format: 'cjs',
      exports: 'named',
      sourcemap: true
    })

    checkWriteBundleHook(mockResolveIdHook)
  })

  it('webpack', async () => {
    expect.assertions(3)
    const mockResolveIdHook = vi.fn(generateMockWriteBundleHook(path.resolve(__dirname, 'test-out/webpack')))
    const plugin = createUnpluginWithCallback(mockResolveIdHook).webpack

    await new Promise((resolve) => {
      build.webpack(
        {
          entry: path.resolve(__dirname, 'test-src/entry.js'),
          plugins: [plugin()],
          devtool: 'source-map',
          output: {
            path: path.resolve(__dirname, 'test-out/webpack'),
            filename: 'output.js',
            libraryTarget: 'commonjs',
            library: {
              type: 'commonjs'
            }
          }
        },
        resolve
      )
    })

    checkWriteBundleHook(mockResolveIdHook)
  })

  it('esbuild', async () => {
    expect.assertions(3)
    const mockResolveIdHook = vi.fn(generateMockWriteBundleHook(path.resolve(__dirname, 'test-out/esbuild')))
    const plugin = createUnpluginWithCallback(mockResolveIdHook).esbuild

    await build.esbuild({
      entryPoints: [path.resolve(__dirname, 'test-src/entry.js')],
      plugins: [plugin()],
      bundle: true, // actually traverse imports
      outfile: path.resolve(__dirname, 'test-out/esbuild/output.js'),
      format: 'cjs',
      sourcemap: true
    })

    checkWriteBundleHook(mockResolveIdHook)
  })
})
