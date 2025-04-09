import type { UnpluginOptions, VitePlugin } from 'unplugin'
import type { Mock } from 'vitest'
import * as path from 'node:path'
import { createUnplugin } from 'unplugin'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { build, toArray } from '../utils'

function createUnpluginWithHooks(
  resolveId: UnpluginOptions['resolveId'],
  load: UnpluginOptions['load'],
  transform: UnpluginOptions['transform'],
) {
  return createUnplugin(() => ({
    name: 'test-plugin',
    resolveId,
    load,
    transform,
  }))
}

function createIdHook() {
  const handler = vi.fn()
  return {
    hook: {
      filter: {
        id: { include: [/\.js$/], exclude: ['**/entry.js', /not-expect/] },
      },
      handler,
    },
    handler,
  }
}

function createTransformHook() {
  const handler = vi.fn()
  return {
    hook: {
      filter: {
        id: { include: [/\.js$/], exclude: ['**/entry.js', /not-expect/] },
        code: { include: '42' },
      },
      handler,
    },
    handler,
  }
}

function check(resolveIdHandler: Mock, loadHandler: Mock, transformHandler: Mock): void {
  expect(resolveIdHandler).toBeCalledTimes(1)
  expect(loadHandler).toBeCalledTimes(1)
  expect(transformHandler).toBeCalledTimes(1)

  const testName = expect.getState().currentTestName
  const hasExtraOptions = testName?.includes('vite') || testName?.includes('rolldown')

  expect(transformHandler).lastCalledWith(
    expect.stringMatching('export default 42'),
    expect.stringMatching(/\bmod\.js$/),
    ...hasExtraOptions ? [expect.anything()] : [],
  )
}

describe('filter', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('vite', async () => {
    const { hook: resolveId, handler: resolveIdHandler } = createIdHook()
    const { hook: load, handler: loadHandler } = createIdHook()
    const { hook: transform, handler: transformHandler } = createTransformHook()
    const plugin = createUnpluginWithHooks(resolveId, load, transform).vite
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

    check(resolveIdHandler, loadHandler, transformHandler)
  })

  it('rollup', async () => {
    const { hook: resolveId, handler: resolveIdHandler } = createIdHook()
    const { hook: load, handler: loadHandler } = createIdHook()
    const { hook: transform, handler: transformHandler } = createTransformHook()
    const plugin = createUnpluginWithHooks(resolveId, load, transform).rollup

    await build.rollup({
      input: path.resolve(__dirname, 'test-src/entry.js'),
      plugins: [plugin()],
    })

    check(resolveIdHandler, loadHandler, transformHandler)
  })

  it('rolldown', async () => {
    const { hook: resolveId, handler: resolveIdHandler } = createIdHook()
    const { hook: load, handler: loadHandler } = createIdHook()
    const { hook: transform, handler: transformHandler } = createTransformHook()
    const plugin = createUnpluginWithHooks(resolveId, load, transform).rolldown

    await build.rolldown({
      input: path.resolve(__dirname, 'test-src/entry.js'),
      plugins: [plugin()],
    })

    check(resolveIdHandler, loadHandler, transformHandler)
  })

  it('webpack', async () => {
    const { hook: resolveId, handler: resolveIdHandler } = createIdHook()
    const { hook: load, handler: loadHandler } = createIdHook()
    const { hook: transform, handler: transformHandler } = createTransformHook()
    const plugin = createUnpluginWithHooks(resolveId, load, transform).webpack

    await new Promise((resolve) => {
      build.webpack(
        {
          entry: path.resolve(__dirname, 'test-src/entry.js'),
          plugins: [plugin()],
        },
        resolve,
      )
    })

    check(resolveIdHandler, loadHandler, transformHandler)
  })

  it('rspack', async () => {
    const { hook: resolveId, handler: resolveIdHandler } = createIdHook()
    const { hook: load, handler: loadHandler } = createIdHook()
    const { hook: transform, handler: transformHandler } = createTransformHook()
    const plugin = createUnpluginWithHooks(resolveId, load, transform).rspack

    await new Promise((resolve) => {
      build.rspack(
        {
          entry: path.resolve(__dirname, 'test-src/entry.js'),
          plugins: [plugin()],
        },
        resolve,
      )
    })

    check(resolveIdHandler, loadHandler, transformHandler)
  })

  it('esbuild', async () => {
    const { hook: resolveId, handler: resolveIdHandler } = createIdHook()
    const { hook: load, handler: loadHandler } = createIdHook()
    const { hook: transform, handler: transformHandler } = createTransformHook()
    const plugin = createUnpluginWithHooks(resolveId, load, transform).esbuild

    await build.esbuild({
      entryPoints: [path.resolve(__dirname, 'test-src/entry.js')],
      plugins: [plugin()],
      bundle: true, // actually traverse imports
      write: false, // don't pollute console
    })

    check(resolveIdHandler, loadHandler, transformHandler)
  })
})
