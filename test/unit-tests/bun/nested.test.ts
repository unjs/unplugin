import { createUnplugin } from 'unplugin'
import { describe, expect, it, vi } from 'vitest'

describe('bun nested plugin support', () => {
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
})
