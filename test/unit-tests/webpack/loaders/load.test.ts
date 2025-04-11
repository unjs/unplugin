import { describe, expect, it, vi } from 'vitest'
import load from '../../../../src/webpack/loaders/load'

describe('load function', () => {
  const mockCallback = vi.fn()
  const mockLoaderContext = {
    async: () => mockCallback,
    query: {
      plugin: {
        load: vi.fn(),
        __virtualModulePrefix: '/virtual/',
      },
    },
    resource: '/virtual/test.js',
    addDependency: vi.fn(),
    getDependencies: vi.fn().mockReturnValue(['/dependency1', '/dependency2']),
    _compiler: {},
    _compilation: {},
  }

  it('should call callback with source and map if plugin.load is not defined', async () => {
    const context = { ...mockLoaderContext, query: { plugin: {} } }
    const source = 'source code'
    const map = 'source map'

    await load.call(context as any, source, map)

    expect(mockCallback).toHaveBeenCalledWith(null, source, map)
  })

  it('should decode id if it starts with __virtualModulePrefix', async () => {
    const source = 'source code'
    const map = 'source map'
    const pluginLoadHandler = vi.fn().mockResolvedValue(null)
    mockLoaderContext.query.plugin.load = pluginLoadHandler

    await load.call(mockLoaderContext as any, source, map)

    expect(pluginLoadHandler).toHaveBeenCalledWith('test.js')
  })

  it('should call callback with transformed code and map if handler returns an object', async () => {
    const source = 'source code'
    const map = 'source map'
    const transformedCode = { code: 'transformed code', map: 'transformed map' }
    const pluginLoadHandler = vi.fn().mockResolvedValue(transformedCode)
    mockLoaderContext.query.plugin.load = pluginLoadHandler

    await load.call(mockLoaderContext as any, source, map)

    expect(mockCallback).toHaveBeenCalledWith(null, transformedCode.code, transformedCode.map)
  })

  it('should call callback with transformed code if handler returns a string', async () => {
    const source = 'source code'
    const map = 'source map'
    const transformedCode = 'transformed code'
    const pluginLoadHandler = vi.fn().mockResolvedValue(transformedCode)
    mockLoaderContext.query.plugin.load = pluginLoadHandler

    await load.call(mockLoaderContext as any, source, map)

    expect(mockCallback).toHaveBeenCalledWith(null, transformedCode, map)
  })
})
