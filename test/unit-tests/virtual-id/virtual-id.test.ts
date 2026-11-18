import type { UnpluginOptions, VitePlugin } from 'unplugin'
import type { Mock } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { createUnplugin } from 'unplugin'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { onlyBun } from '../../utils'
import { build, runRspack, runWebpack, toArray } from '../utils'

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
  const testName = expect.getState().currentTestName
  const hasExtraOptions = testName?.includes('vite')
    || testName?.includes('rollup')

  expect(loadCallback).toHaveBeenCalledWith(
    expect.stringMatching(/(?:\/|\\)entry\.js\.js$/),
    ...(hasExtraOptions
      ? [
          expect.anything(),
        ]
      : []),
  )

  expect(loadCallback).toHaveBeenCalledWith(
    expect.stringMatching(/(?:\/|\\)imported\.js\.js$/),
    ...(hasExtraOptions
      ? [
          expect.anything(),
        ]
      : []),
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
      plugins: [
        plugin(),
      ],
    })

    checkResolveIdHook(mockResolveIdHook)
    checkLoadHook(mockLoadHook)
  })

  it('webpack', async () => {
    const mockResolveIdHook = createResolveIdHook()
    const mockLoadHook = createLoadHook()
    const plugin = createUnpluginWithCallbacks(mockResolveIdHook, mockLoadHook).webpack

    await runWebpack({
      entry: path.resolve(__dirname, 'test-src/entry.js'),
      plugins: [
        plugin(),
      ],
    })

    checkResolveIdHook(mockResolveIdHook)
    checkLoadHook(mockLoadHook)
  })

  it.skip('rspack', async () => {
    const mockResolveIdHook = createResolveIdHook()
    const mockLoadHook = createLoadHook()
    const plugin = createUnpluginWithCallbacks(mockResolveIdHook, mockLoadHook).rspack

    await runRspack({
      entry: path.resolve(__dirname, 'test-src/entry.js'),
      plugins: [
        plugin(),
      ],
    })

    checkResolveIdHook(mockResolveIdHook)
    checkLoadHook(mockLoadHook)
  })

  it('esbuild', async () => {
    const mockResolveIdHook = createResolveIdHook()
    const mockLoadHook = createLoadHook()
    const plugin = createUnpluginWithCallbacks(mockResolveIdHook, mockLoadHook).esbuild

    await build.esbuild({
      entryPoints: [
        path.resolve(__dirname, 'test-src/entry.js'),
      ],
      plugins: [
        plugin(),
      ],
      bundle: true, // actually traverse imports
      write: false, // don't pollute console
    })

    checkResolveIdHook(mockResolveIdHook)
    checkLoadHook(mockLoadHook)
  })

  onlyBun('bun', async () => {
    const mockResolveIdHook = createResolveIdHook()
    const mockLoadHook = createLoadHook()
    const plugin = createUnpluginWithCallbacks(mockResolveIdHook, mockLoadHook).bun

    await build.bun({
      entrypoints: [
        path.resolve(__dirname, 'test-src/entry.js'),
      ],
      plugins: [
        plugin(),
      ],
    })

    checkResolveIdHook(mockResolveIdHook)
    checkLoadHook(mockLoadHook)
  })
})

describe('virtual ids with leading slash', () => {
  const slashRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'unplugin-virtual-slash-')))
  const slashEntry = path.join(slashRoot, 'entry.js')
  fs.writeFileSync(
    slashEntry,
    'import one from "virtual/1"\nimport two from "virtual/2"\nexport default [one, two]\n',
  )

  afterAll(() => {
    fs.rmSync(slashRoot, { recursive: true, force: true })
  })

  function createSlashVirtualPlugin() {
    const loadedIds: string[] = []
    const plugin = createUnplugin(() => ({
      name: 'slash-virtual-plugin',
      resolveId(id) {
        return id.startsWith('virtual/')
          ? `/__${id}`
          : null
      },
      loadInclude(id) {
        return id.startsWith('/__virtual/')
      },
      load(id) {
        loadedIds.push(id)
        if (id === '/__virtual/1')
          return 'export default "VIRTUAL:ONE"'
        if (id === '/__virtual/2')
          return 'export default "VIRTUAL:TWO"'
        throw new Error(`Unexpected id: ${id}`)
      },
    }))
    return { loadedIds, plugin }
  }

  it('vite', async () => {
    const { loadedIds, plugin } = createSlashVirtualPlugin()
    const plugins = toArray(plugin.vite()).map((p): VitePlugin => ({ ...p, enforce: 'pre' }))

    await build.vite({
      clearScreen: false,
      plugins: [plugins],
      build: {
        lib: {
          entry: slashEntry,
          name: 'SlashLib',
        },
        write: false,
      },
    })

    expect(loadedIds).toEqual(expect.arrayContaining(['/__virtual/1', '/__virtual/2']))
  })

  it('rollup', async () => {
    const { loadedIds, plugin } = createSlashVirtualPlugin()

    await build.rollup({
      input: slashEntry,
      plugins: [
        plugin.rollup(),
      ],
    })

    expect(loadedIds).toEqual(expect.arrayContaining(['/__virtual/1', '/__virtual/2']))
  })

  it('webpack', async () => {
    const { loadedIds, plugin } = createSlashVirtualPlugin()

    await runWebpack({
      mode: 'development',
      context: slashRoot,
      entry: slashEntry,
      output: {
        path: path.join(slashRoot, 'dist-webpack'),
      },
      plugins: [
        plugin.webpack(),
      ],
    })

    expect(loadedIds).toEqual(expect.arrayContaining(['/__virtual/1', '/__virtual/2']))
    const bundle = fs.readFileSync(path.join(slashRoot, 'dist-webpack/main.js'), 'utf-8')
    expect(bundle).toContain('VIRTUAL:ONE')
    expect(bundle).toContain('VIRTUAL:TWO')
  })

  it('rspack', async () => {
    const { loadedIds, plugin } = createSlashVirtualPlugin()

    await runRspack({
      mode: 'development',
      context: slashRoot,
      entry: slashEntry,
      output: {
        path: path.join(slashRoot, 'dist-rspack'),
      },
      plugins: [
        plugin.rspack(),
      ],
    })

    expect(loadedIds).toEqual(expect.arrayContaining(['/__virtual/1', '/__virtual/2']))
    const bundle = fs.readFileSync(path.join(slashRoot, 'dist-rspack/main.js'), 'utf-8')
    expect(bundle).toContain('VIRTUAL:ONE')
    expect(bundle).toContain('VIRTUAL:TWO')
  })

  it('esbuild', async () => {
    const { loadedIds, plugin } = createSlashVirtualPlugin()

    await build.esbuild({
      entryPoints: [slashEntry],
      plugins: [
        plugin.esbuild(),
      ],
      bundle: true,
      write: false,
    })

    expect(loadedIds).toEqual(expect.arrayContaining(['/__virtual/1', '/__virtual/2']))
  })

  onlyBun('bun', async () => {
    const { loadedIds, plugin } = createSlashVirtualPlugin()

    await build.bun({
      entrypoints: [slashEntry],
      plugins: [
        plugin.bun(),
      ],
    })

    expect(loadedIds).toEqual(expect.arrayContaining(['/__virtual/1', '/__virtual/2']))
  })
})
