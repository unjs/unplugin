import { createUnplugin } from 'unplugin'
import { describe, expect, it, vi } from 'vitest'

describe.skipIf(typeof Bun === 'undefined')('bun nested plugin support', () => {
  it('should call buildStart for all nested plugins', async () => {
    const buildStart1 = vi.fn()
    const buildStart2 = vi.fn()

    const unplugin = createUnplugin(() => [
      {
        name: 'plugin-1',
        buildStart: buildStart1,
      },
      {
        name: 'plugin-2',
        buildStart: buildStart2,
      },
    ])

    const bunPlugin = unplugin.bun()
    const mockBuild: Bun.PluginBuilder = {
      onResolve: vi.fn(),
      onLoad: vi.fn(),
      onStart: vi.fn(callback => callback()),
      config: { outdir: './dist' } as Bun.BuildConfig & { plugins: Bun.BunPlugin[] },
    } as Partial<Bun.PluginBuilder> as Bun.PluginBuilder

    await bunPlugin.setup(mockBuild)

    expect(buildStart1).toHaveBeenCalledTimes(1)
    expect(buildStart2).toHaveBeenCalledTimes(1)
  })

  it('should handle resolveId from multiple plugins', async () => {
    const resolveId1 = vi.fn().mockResolvedValue('resolved-1')
    const resolveId2 = vi.fn().mockResolvedValue('resolved-2')

    const unplugin = createUnplugin(() => [
      {
        name: 'plugin-1',
        resolveId: resolveId1,
      },
      {
        name: 'plugin-2',
        resolveId: resolveId2,
      },
    ])

    const bunPlugin = unplugin.bun()
    const onResolveCallback = vi.fn()
    const mockBuild = {
      onResolve: vi.fn((options, callback) => {
        onResolveCallback.mockImplementation(callback)
      }),
      onLoad: vi.fn(),
      onStart: vi.fn(),
      config: { outdir: './dist' },
    } as never as Bun.PluginBuilder

    await bunPlugin.setup(mockBuild)

    expect(mockBuild.onResolve).toHaveBeenCalledWith(
      { filter: /.*/ },
      expect.any(Function),
    )

    const result = await onResolveCallback({
      path: 'test.js',
      importer: 'index.js',
      kind: 'import-statement',
    })

    expect(result).toEqual({ path: 'resolved-1', namespace: 'plugin-1' })
    expect(resolveId1).toHaveBeenCalledWith(
      'test.js',
      'index.js',
      { isEntry: false },
    )

    expect(resolveId2).not.toHaveBeenCalled()
  })

  it('should handle transform from multiple plugins', async () => {
    const transform1 = vi.fn((code: string) => `${code}\n// transformed by plugin-1`)
    const transform2 = vi.fn((code: string) => `${code}\n// transformed by plugin-2`)

    const unplugin = createUnplugin(() => [
      {
        name: 'plugin-1',
        transform: transform1,
      },
      {
        name: 'plugin-2',
        transform: transform2,
      },
    ])

    const bunPlugin = unplugin.bun()
    let onLoadCallback: Bun.OnLoadCallback
    const mockBuild = {
      onResolve: vi.fn(),
      onLoad: vi.fn((options, callback) => {
        if (!onLoadCallback) {
          onLoadCallback = callback
        }
      }),
      onStart: vi.fn(),
      config: { outdir: './dist' },
    } as never as Bun.PluginBuilder

    const originalFile = Bun.file

    Bun.file = vi.fn().mockReturnValue({
      text: vi.fn().mockResolvedValue('original code'),
    })

    await bunPlugin.setup(mockBuild)

    const result = await onLoadCallback!({
      path: 'test.js',
      loader: 'js',
    } as Bun.OnLoadArgs)

    expect(result).toEqual({
      contents: 'original code\n// transformed by plugin-1\n// transformed by plugin-2',
      loader: 'js',
    })

    expect(transform1).toHaveBeenCalledWith('original code', 'test.js')
    expect(transform2).toHaveBeenCalledWith('original code\n// transformed by plugin-1', 'test.js')

    Bun.file = originalFile
  })

  it('should respect loader returned from a load hook', async () => {
    const unplugin = createUnplugin(() => ({
      name: 'jsx-virtual',
      resolveId(id: string) {
        return id === 'virtual:component' ? id : null
      },
      load(id: string) {
        if (id === 'virtual:component') {
          return { code: 'export default () => <h1>hi</h1>', loader: 'tsx' as const }
        }
        return null
      },
    }))

    const bunPlugin = unplugin.bun()
    const onLoadCallbacks: Array<{ namespace?: string, cb: Bun.OnLoadCallback }> = []
    const mockBuild = {
      onResolve: vi.fn(),
      onLoad: vi.fn((options, callback) => {
        onLoadCallbacks.push({ namespace: options.namespace, cb: callback })
      }),
      onStart: vi.fn(),
      config: { outdir: './dist' },
    } as never as Bun.PluginBuilder

    await bunPlugin.setup(mockBuild)

    const virtualHandler = onLoadCallbacks.find(c => c.namespace !== 'file')?.cb
    expect(virtualHandler).toBeDefined()

    const result = await virtualHandler!({
      path: 'virtual:component',
      // Bun's own guess for an id without a recognized extension
      loader: 'js',
    } as Bun.OnLoadArgs)

    expect(result).toEqual({
      contents: 'export default () => <h1>hi</h1>',
      loader: 'tsx',
    })
  })

  it('should respect a static plugin.bun.loader', async () => {
    const unplugin = createUnplugin(() => ({
      name: 'tsx-loader',
      resolveId(id: string) {
        return id === 'virtual:component' ? id : null
      },
      load(id: string) {
        if (id === 'virtual:component') {
          return 'export default () => <h1>hi</h1>'
        }
        return null
      },
      bun: { loader: 'tsx' as const },
    }))

    const bunPlugin = unplugin.bun()
    const onLoadCallbacks: Array<{ namespace?: string, cb: Bun.OnLoadCallback }> = []
    const mockBuild = {
      onResolve: vi.fn(),
      onLoad: vi.fn((options, callback) => {
        onLoadCallbacks.push({ namespace: options.namespace, cb: callback })
      }),
      onStart: vi.fn(),
      config: { outdir: './dist' },
    } as never as Bun.PluginBuilder

    await bunPlugin.setup(mockBuild)

    const virtualHandler = onLoadCallbacks.find(c => c.namespace !== 'file')?.cb
    expect(virtualHandler).toBeDefined()

    const result = await virtualHandler!({
      path: 'virtual:component',
      loader: 'js',
    } as Bun.OnLoadArgs)

    expect(result).toEqual({
      contents: 'export default () => <h1>hi</h1>',
      loader: 'tsx',
    })
  })

  it('should call plugin.bun.loader as a function with code and id', async () => {
    const loaderFn = vi.fn((_code: string, _id: string) => 'tsx' as const)
    const unplugin = createUnplugin(() => ({
      name: 'tsx-loader-fn',
      resolveId(id: string) {
        return id === 'virtual:component' ? id : null
      },
      load(id: string) {
        if (id === 'virtual:component') {
          return 'export default () => <h1>hi</h1>'
        }
        return null
      },
      bun: { loader: loaderFn },
    }))

    const bunPlugin = unplugin.bun()
    const onLoadCallbacks: Array<{ namespace?: string, cb: Bun.OnLoadCallback }> = []
    const mockBuild = {
      onResolve: vi.fn(),
      onLoad: vi.fn((options, callback) => {
        onLoadCallbacks.push({ namespace: options.namespace, cb: callback })
      }),
      onStart: vi.fn(),
      config: { outdir: './dist' },
    } as never as Bun.PluginBuilder

    await bunPlugin.setup(mockBuild)

    const virtualHandler = onLoadCallbacks.find(c => c.namespace !== 'file')?.cb
    const result = await virtualHandler!({
      path: 'virtual:component',
      loader: 'js',
    } as Bun.OnLoadArgs)

    expect(loaderFn).toHaveBeenCalledWith('export default () => <h1>hi</h1>', 'virtual:component')
    expect(result).toEqual({
      contents: 'export default () => <h1>hi</h1>',
      loader: 'tsx',
    })
  })

  it('should prefer load-hook loader over plugin.bun.loader', async () => {
    const unplugin = createUnplugin(() => ({
      name: 'loader-priority',
      resolveId(id: string) {
        return id === 'virtual:component' ? id : null
      },
      load(id: string) {
        if (id === 'virtual:component') {
          return { code: 'export default () => <h1>hi</h1>', loader: 'tsx' as const }
        }
        return null
      },
      bun: { loader: 'js' as const },
    }))

    const bunPlugin = unplugin.bun()
    const onLoadCallbacks: Array<{ namespace?: string, cb: Bun.OnLoadCallback }> = []
    const mockBuild = {
      onResolve: vi.fn(),
      onLoad: vi.fn((options, callback) => {
        onLoadCallbacks.push({ namespace: options.namespace, cb: callback })
      }),
      onStart: vi.fn(),
      config: { outdir: './dist' },
    } as never as Bun.PluginBuilder

    await bunPlugin.setup(mockBuild)

    const virtualHandler = onLoadCallbacks.find(c => c.namespace !== 'file')?.cb
    const result = await virtualHandler!({
      path: 'virtual:component',
      loader: 'js',
    } as Bun.OnLoadArgs)

    expect(result).toEqual({
      contents: 'export default () => <h1>hi</h1>',
      loader: 'tsx',
    })
  })

  it('should call plugin.bun.setup with the build before standard hooks', async () => {
    const callOrder: string[] = []
    const bunSetup = vi.fn((_build: Bun.PluginBuilder) => {
      callOrder.push('plugin.bun.setup')
    })

    const unplugin = createUnplugin(() => ({
      name: 'with-bun-setup',
      bun: { setup: bunSetup },
      resolveId: () => null,
      load: () => null,
    }))

    const bunPlugin = unplugin.bun()
    const mockBuild = {
      onResolve: vi.fn(() => {
        callOrder.push('onResolve')
      }),
      onLoad: vi.fn(() => {
        callOrder.push('onLoad')
      }),
      onStart: vi.fn(),
      config: { outdir: './dist' },
    } as never as Bun.PluginBuilder

    await bunPlugin.setup(mockBuild)

    expect(bunSetup).toHaveBeenCalledTimes(1)
    expect(bunSetup).toHaveBeenCalledWith(mockBuild)
    expect(callOrder).toEqual(['plugin.bun.setup', 'onResolve', 'onLoad', 'onLoad'])
  })
})
