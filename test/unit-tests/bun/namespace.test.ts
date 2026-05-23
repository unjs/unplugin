import { createUnplugin } from 'unplugin'
import { describe, expect, it, vi } from 'vitest'

interface MockBuild {
  build: Bun.PluginBuilder
  resolveCallback: () => Bun.OnResolveCallback
  loadCallbacks: Map<string, Bun.OnLoadCallback>
}

function createMockBuild(): MockBuild {
  let resolveCallback: Bun.OnResolveCallback | undefined
  const loadCallbacks = new Map<string, Bun.OnLoadCallback>()

  const build = {
    onResolve: vi.fn((_options, callback) => {
      resolveCallback = callback
    }),
    onLoad: vi.fn((options: { namespace?: string }, callback: Bun.OnLoadCallback) => {
      if (options.namespace) {
        loadCallbacks.set(options.namespace, callback)
      }
    }),
    onStart: vi.fn(),
    config: { outdir: './dist' },
  } as never as Bun.PluginBuilder

  return {
    build,
    resolveCallback: () => {
      if (!resolveCallback) {
        throw new Error('onResolve was not registered')
      }
      return resolveCallback
    },
    loadCallbacks,
  }
}

describe.skipIf(typeof Bun === 'undefined')('bun namespace sanitization', () => {
  it('should sanitize invalid characters when resolveId returns a string', async () => {
    const unplugin = createUnplugin(() => ({
      name: 'unplugin:my.plugin/name',
      resolveId: () => 'virtual-id',
    }))
    const { build, resolveCallback } = createMockBuild()

    await unplugin.bun().setup(build)
    const result = await resolveCallback()({
      path: 'foo',
      importer: 'index.js',
      kind: 'import-statement',
    } as Bun.OnResolveArgs)

    expect(result).toEqual({
      path: 'virtual-id',
      namespace: 'unplugin-my-plugin-name',
    })
  })

  it('should sanitize invalid characters when resolveId returns an object', async () => {
    const unplugin = createUnplugin(() => ({
      name: '@scope/plugin.name',
      resolveId: () => ({ id: 'virtual-id', external: false }),
    }))
    const { build, resolveCallback } = createMockBuild()

    await unplugin.bun().setup(build)
    const result = await resolveCallback()({
      path: 'foo',
      importer: 'index.js',
      kind: 'import-statement',
    } as Bun.OnResolveArgs)

    expect(result).toEqual({
      path: 'virtual-id',
      external: false,
      namespace: '-scope-plugin-name',
    })
  })

  it('should leave plugin names with only allowed characters untouched', async () => {
    const unplugin = createUnplugin(() => ({
      name: 'valid_plugin-name$1',
      resolveId: () => 'virtual-id',
    }))
    const { build, resolveCallback } = createMockBuild()

    await unplugin.bun().setup(build)
    const result = await resolveCallback()({
      path: 'foo',
      importer: 'index.js',
      kind: 'import-statement',
    } as Bun.OnResolveArgs)

    expect(result).toEqual({
      path: 'virtual-id',
      namespace: 'valid_plugin-name$1',
    })
  })

  it('should invoke the original load hook when registered under a sanitized namespace', async () => {
    const load = vi.fn(() => 'export default 1')
    const unplugin = createUnplugin(() => ({
      name: 'unplugin:virtual.mod',
      resolveId: () => 'virtual-id',
      load,
    }))
    const { build, loadCallbacks } = createMockBuild()

    await unplugin.bun().setup(build)

    expect([...loadCallbacks.keys()]).toContain('unplugin-virtual-mod')
    expect([...loadCallbacks.keys()]).not.toContain('unplugin:virtual.mod')

    const result = await loadCallbacks.get('unplugin-virtual-mod')!({
      path: 'virtual-id',
      loader: 'js',
    } as Bun.OnLoadArgs)

    expect(load).toHaveBeenCalledWith('virtual-id')
    expect(result).toEqual({
      contents: 'export default 1',
      loader: 'js',
    })
  })
})
