import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import load, { raw } from '../../../../src/webpack/loaders/load'

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
    const context = {
      ...mockLoaderContext,
      query: { plugin: {} },
    }
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

  it('should call callback with the error if the handler throws', async () => {
    const source = 'source code'
    const map = 'source map'
    const error = new Error('Handler error')
    const pluginLoadHandler = vi.fn().mockRejectedValue(error)
    mockLoaderContext.query.plugin.load = pluginLoadHandler

    await load.call(mockLoaderContext as any, source, map)

    expect(pluginLoadHandler).toHaveBeenCalled()
    expect(mockCallback).toHaveBeenCalledWith(error)
  })

  it('should be a raw loader so binary files are not decoded as text', () => {
    expect(raw).toBe(true)
  })

  it('should pass a binary source on untouched when the load hook does not handle it', async () => {
    const png = Buffer.from([
      0x89,
      0x50,
      0x4E,
      0x47,
      0x0D,
      0x0A,
      0x1A,
      0x0A,
      0xFF,
      0xFE,
      0x00,
    ])
    mockLoaderContext.query.plugin.load = vi.fn().mockResolvedValue(null)
    mockLoaderContext.resource = '/virtual/image.png'

    await load.call(mockLoaderContext as any, png, undefined)

    const [, passedSource] = mockCallback.mock.calls.at(-1)!
    expect(Buffer.isBuffer(passedSource) && passedSource.equals(png)).toBe(true)
  })
})
