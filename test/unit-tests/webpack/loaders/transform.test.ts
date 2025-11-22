import type { NativeBuildContext, UnpluginBuildContext } from '../../../../src/types'
import { assert, describe, expect, it, vi } from 'vitest'
import transform from '../../../../src/webpack/loaders/transform'

describe('transform loader', () => {
  const mockCallback = vi.fn()
  const mockLoaderContext = {
    async: () => mockCallback,
    query: {},
    resource: '/path/to/resource',
    addDependency: vi.fn(),
    getDependencies: vi.fn().mockReturnValue(['/path/to/dependency']),
    _compiler: {},
    _compilation: {},
  }

  it('should return source and map if plugin.transform is not defined', async () => {
    const source = 'source code'
    const map = 'source map'

    mockLoaderContext.query = {}

    await transform.call(mockLoaderContext as any, source, map)

    expect(mockCallback).toHaveBeenCalledWith(null, source, map)
  })

  it('should return source and map if filter does not match', async () => {
    const source = 'source code'
    const map = 'source map'

    mockLoaderContext.query = {
      plugin: {
        transform: {
          handler: vi.fn(),
          filter: vi.fn().mockReturnValue(false),
        },
      },
    }

    await transform.call(mockLoaderContext as any, source, map)

    expect(mockCallback).toHaveBeenCalledWith(null, source, map)
  })

  it('should call handler and return transformed code', async () => {
    const source = 'source code'
    const map = 'source map'
    const transformedCode = 'transformed code'

    const handlerMock = vi.fn().mockResolvedValue(transformedCode)
    mockLoaderContext.query = {
      plugin: {
        transform: {
          handler: handlerMock,
          filter: vi.fn().mockReturnValue(true),
        },
      },
    }

    await transform.call(mockLoaderContext as any, source, map)

    expect(handlerMock).toHaveBeenCalled()
    expect(mockCallback).toHaveBeenCalledWith(null, transformedCode, map)
  })

  it('should call handler and return transformed code and map if handler returns an object', async () => {
    const source = 'source code'
    const map = 'source map'
    const transformedResult = { code: 'transformed code', map: 'transformed map' }

    const handlerMock = vi.fn().mockResolvedValue(transformedResult)
    mockLoaderContext.query = {
      plugin: {
        transform: {
          handler: handlerMock,
          filter: vi.fn().mockReturnValue(true),
        },
      },
    }

    await transform.call(mockLoaderContext as any, source, map)

    expect(handlerMock).toHaveBeenCalled()
    expect(mockCallback).toHaveBeenCalledWith(null, transformedResult.code, transformedResult.map)
  })

  it('should handle errors thrown by the handler', async () => {
    const source = 'source code'
    const map = 'source map'
    const error = new Error('Handler error')

    const handlerMock = vi.fn().mockRejectedValue(error)
    mockLoaderContext.query = {
      plugin: {
        transform: {
          handler: handlerMock,
          filter: vi.fn().mockReturnValue(true),
        },
      },
    }

    await transform.call(mockLoaderContext as any, source, map)

    expect(handlerMock).toHaveBeenCalled()
    expect(mockCallback).toHaveBeenCalledWith(error)
  })

  it('should include input source map on native build context', async () => {
    const source = 'source code'
    const map = 'source map'
    const transformedCode = 'transformed code'
    const transformedMap = 'transformed map'

    let handlerSource: string | undefined
    let handlerId: string | undefined
    let handlerNativeBuildContext: NativeBuildContext | undefined
    const handlerMock = vi.fn().mockImplementation(function (this: UnpluginBuildContext, source: string, id: string) {
      handlerSource = source
      handlerId = id
      handlerNativeBuildContext = this.getNativeBuildContext?.()
      return { code: transformedCode, map: transformedMap }
    })

    mockLoaderContext.query = {
      plugin: {
        transform: {
          handler: handlerMock,
          filter: vi.fn().mockReturnValue(true),
        },
      },
    }

    await transform.call(mockLoaderContext as any, source, map)

    expect(handlerMock).toHaveBeenCalled()
    expect(handlerSource).toBe(source)
    expect(handlerId).toBe(mockLoaderContext.resource)
    assert(handlerNativeBuildContext?.framework === 'webpack')
    expect(handlerNativeBuildContext?.inputSourceMap).toBe(map)

    expect(mockCallback).toHaveBeenCalledWith(null, transformedCode, transformedMap)
  })
})
