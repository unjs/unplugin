import type { RspackOptions } from '@rspack/core'
import type { UnpluginOptions, VitePlugin } from 'unplugin'
import type { Mock } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createUnplugin } from 'unplugin'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { build, toArray, webpackVersion } from '../utils'

function createUnpluginWithCallback(writeBundleCallback: UnpluginOptions['writeBundle']) {
  return createUnplugin(() => ({
    name: 'test-plugin',
    writeBundle: writeBundleCallback,
  }))
}

function generateMockWriteBundleHook(outputPath: string) {
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
function checkWriteBundleHook(writeBundleCallback: Mock): void {
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
          formats: ['es'],
        },
        outDir: path.resolve(__dirname, 'test-out/vite'),
        sourcemap: true,
      },
    })

    checkWriteBundleHook(mockWriteBundleHook)
  })

  it('rollup', async () => {
    expect.assertions(3)
    const mockResolveIdHook = vi.fn(generateMockWriteBundleHook(path.resolve(__dirname, 'test-out/rollup')))
    const plugin = createUnpluginWithCallback(mockResolveIdHook).rollup

    const rollupBuild = await build.rollup({
      input: path.resolve(__dirname, 'test-src/entry.js'),
    })

    await rollupBuild.write({
      plugins: [plugin()],
      file: path.resolve(__dirname, 'test-out/rollup/output.js'),
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
    })

    checkWriteBundleHook(mockResolveIdHook)
  })

  it('webpack', async () => {
    expect.assertions(3)
    const mockResolveIdHook = vi.fn(generateMockWriteBundleHook(path.resolve(__dirname, 'test-out/webpack')))
    const plugin = createUnpluginWithCallback(mockResolveIdHook).webpack

    const webpack4Options = {
      entry: path.resolve(__dirname, 'test-src/entry.js'),
      cache: false,
      output: {
        path: path.resolve(__dirname, 'test-out/webpack'),
        filename: 'output.js',
        libraryTarget: 'commonjs',
      },
      plugins: [plugin()],
      devtool: 'source-map',
    }

    const webpack5Options = {
      entry: path.resolve(__dirname, 'test-src/entry.js'),
      plugins: [plugin()],
      devtool: 'source-map',
      output: {
        path: path.resolve(__dirname, 'test-out/webpack'),
        filename: 'output.js',
        library: {
          type: 'commonjs',
        },
      },
    }

    await new Promise((resolve) => {
      build.webpack(webpackVersion!.startsWith('4') ? webpack4Options : webpack5Options, resolve)
    })

    checkWriteBundleHook(mockResolveIdHook)
  })

  it('rspack', async () => {
    expect.assertions(3)
    const mockResolveIdHook = vi.fn(generateMockWriteBundleHook(path.resolve(__dirname, 'test-out/rspack')))
    const plugin = createUnpluginWithCallback(mockResolveIdHook).rspack

    const rspackOptions: RspackOptions = {
      entry: path.resolve(__dirname, 'test-src/entry.js'),
      plugins: [plugin()],
      devtool: 'source-map',
      output: {
        path: path.resolve(__dirname, 'test-out/rspack'),
        filename: 'output.js',
        library: {
          type: 'commonjs',
        },
      },
    }

    await new Promise((resolve) => {
      build.rspack(rspackOptions, resolve)
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
      sourcemap: true,
    })

    checkWriteBundleHook(mockResolveIdHook)
  })
})
