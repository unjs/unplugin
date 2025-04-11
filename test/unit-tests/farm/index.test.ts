import type { UnpluginOptions } from '../../../src/types'
import { describe, expect, it, vi } from 'vitest'
import { getFarmPlugin, toFarmPlugin } from '../../../src/farm/index'

describe('getFarmPlugin', () => {
  it('should return a single plugin when factory returns one plugin', () => {
    const mockFactory = vi.fn(() => ({
      name: 'test-plugin',
    }))

    const plugin = getFarmPlugin(mockFactory as any)

    expect(plugin).toBeDefined()
  })

  it('should return an array of plugins when factory returns multiple plugins', () => {
    const mockFactory = vi.fn().mockReturnValue([
      { name: 'test-plugin-1', farm: true },
      { name: 'test-plugin-2', farm: true },
    ])

    const func = getFarmPlugin(mockFactory as any)
    const plugins: any = func({})

    expect(plugins).toBeDefined()
    expect(plugins).toHaveLength(2)
    expect(plugins[0]).toHaveProperty('name', 'test-plugin-1')
    expect(plugins[1]).toHaveProperty('name', 'test-plugin-2')
  })
})

describe('toFarmPlugin', () => {
  it('should convert a basic plugin to a Farm plugin', () => {
    const plugin: UnpluginOptions = {
      name: 'test-plugin',
    }

    const farmPlugin = toFarmPlugin(plugin)

    expect(farmPlugin).toBeDefined()
    expect(farmPlugin).toHaveProperty('name', 'test-plugin')
  })

  it('should handle buildStart hook', async () => {
    const buildStartMock = vi.fn()
    const plugin: UnpluginOptions = {
      name: 'test-plugin',
      buildStart: buildStartMock,
    }

    const farmPlugin = toFarmPlugin(plugin)

    expect(farmPlugin.buildStart).toBeDefined()
    await farmPlugin.buildStart?.executor({}, {} as any)

    expect(buildStartMock).toHaveBeenCalled()
  })

  it('should handle resolveId hook', async () => {
    const resolveIdMock = vi.fn(() => 'resolved-id')
    const plugin: UnpluginOptions = {
      name: 'test-plugin',
      resolveId: resolveIdMock,
    }

    const farmPlugin = toFarmPlugin(plugin)

    expect(farmPlugin.resolve).toBeDefined()
    const result = await farmPlugin.resolve?.executor(
      { source: 'test-source', importer: 'test-importer' } as any,
      {} as any,
    )

    expect(resolveIdMock).toHaveBeenCalled()
    expect(result).toHaveProperty('resolvedPath', 'resolved-id')
  })

  it('should handle load hook', async () => {
    const loadMock = vi.fn(() => ({ code: 'test-content' }))
    const plugin: UnpluginOptions = {
      name: 'test-plugin',
      load: loadMock,
    }

    const farmPlugin = toFarmPlugin(plugin)

    expect(farmPlugin.load).toBeDefined()
    const result = await farmPlugin.load?.executor(
      { resolvedPath: 'test-path', query: [['', '']] } as any,
      {} as any,
    )

    expect(loadMock).toHaveBeenCalled()
    expect(result).toHaveProperty('content', 'test-content')
  })

  it('should handle transform hook', async () => {
    const transformMock = vi.fn(() => ({ code: 'transformed-content' }))
    const plugin: UnpluginOptions = {
      name: 'test-plugin',
      transform: transformMock,
    }

    const farmPlugin = toFarmPlugin(plugin)

    expect(farmPlugin.transform).toBeDefined()
    const result = await farmPlugin.transform?.executor(
      { resolvedPath: 'test-path', content: 'original-content', query: [['', '']] } as any,
      {} as any,
    )

    expect(transformMock).toHaveBeenCalled()
    expect(result).toHaveProperty('content', 'transformed-content')
  })

  it('should handle watchChange hook', async () => {
    const watchChangeMock = vi.fn()
    const plugin: UnpluginOptions = {
      name: 'test-plugin',
      watchChange: watchChangeMock,
    }

    const farmPlugin = toFarmPlugin(plugin)

    expect(farmPlugin.updateModules).toBeDefined()
    await farmPlugin.updateModules?.executor(
      { paths: [['test-path', 'change']] },
      {} as any,
    )

    expect(watchChangeMock).toHaveBeenCalled()
  })

  it('should handle buildEnd hook', async () => {
    const buildEndMock = vi.fn()
    const plugin: UnpluginOptions = {
      name: 'test-plugin',
      buildEnd: buildEndMock,
    }

    const farmPlugin = toFarmPlugin(plugin)

    expect(farmPlugin.buildEnd).toBeDefined()
    await farmPlugin.buildEnd?.executor({}, {} as any)

    expect(buildEndMock).toHaveBeenCalled()
  })

  it('should handle farm-specific properties in plugins', () => {
    const plugin = {
      name: 'test-plugin',
      farm: {
        customProperty: 'custom-value',
      },
    }

    const farmPlugin = toFarmPlugin(plugin as any)

    expect(farmPlugin).toHaveProperty('customProperty', 'custom-value')
  })

  it('should handle filters in resolveId hook', async () => {
    const resolveIdMock = vi.fn(() => 'resolved-id')
    const plugin: UnpluginOptions = {
      name: 'test-plugin',
      resolveId: resolveIdMock,
    }

    const farmPlugin = toFarmPlugin(plugin, { filters: ['custom-filter'] })

    expect(farmPlugin.resolve).toBeDefined()
    expect(farmPlugin.resolve?.filters.sources).toContain('custom-filter')
  })

  it('should handle isEntry in resolveId hook', async () => {
    const resolveIdMock = vi.fn(() => 'resolved-id')
    const plugin: UnpluginOptions = {
      name: 'test-plugin',
      resolveId: resolveIdMock,
    }

    const farmPlugin = toFarmPlugin(plugin)

    const result = await farmPlugin.resolve?.executor(
      { source: 'test-source', importer: 'test-importer', kind: { entry: 'index' } } as any,
      {} as any,
    )

    expect(resolveIdMock).toHaveBeenCalledWith(
      'test-source',
      expect.anything(),
      expect.objectContaining({ isEntry: true }),
    )
    expect(result).toHaveProperty('resolvedPath', 'resolved-id')
  })
})
