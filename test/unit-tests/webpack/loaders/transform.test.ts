import type { NativeBuildContext, UnpluginBuildContext } from '../../../../src/types'
import { Buffer } from 'node:buffer'
import { assert, describe, expect, it, vi } from 'vitest'
import transform, { raw } from '../../../../src/webpack/loaders/transform'

const originalMap = {
  version: 3,
  names: [],
  sources: ['original.ts'],
  sourcesContent: ['original source'],
  mappings: 'AACA',
}
const transformedMap = {
  version: 3,
  names: [],
  sources: ['intermediate.js'],
  sourcesContent: ['intermediate source'],
  mappings: ';AAAA',
}
const multiSourceMap = {
  version: 3,
  names: [],
  sources: ['original.ts', 'other.ts'],
  sourcesContent: ['original source', 'other source'],
  mappings: 'AAAA,CCAA',
}
const composedMap = expect.objectContaining({
  sources: ['original.ts'],
  sourcesContent: ['original source'],
  mappings: ';AACA',
})

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

    const handler = vi.fn()
    mockLoaderContext.query = {
      plugin: {
        transform: {
          handler,
          filter: { id: /\.never-matches$/ },
        },
      },
    }

    await transform.call(mockLoaderContext as any, source, map)

    expect(handler).not.toHaveBeenCalled()
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
          filter: { id: /./ },
        },
      },
    }

    await transform.call(mockLoaderContext as any, source, map)

    expect(handlerMock).toHaveBeenCalled()
    expect(mockCallback).toHaveBeenCalledWith(null, transformedCode, map)
  })

  it('should call handler and return transformed code and map if handler returns an object', async () => {
    const source = 'source code'
    const map = originalMap
    const transformedResult = { code: 'transformed code', map: transformedMap }

    const handlerMock = vi.fn().mockResolvedValue(transformedResult)
    mockLoaderContext.query = {
      plugin: {
        transform: {
          handler: handlerMock,
          filter: { id: /./ },
        },
      },
    }

    await transform.call(mockLoaderContext as any, source, map)

    expect(handlerMock).toHaveBeenCalled()
    expect(mockCallback).toHaveBeenCalledWith(null, transformedResult.code, composedMap)
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
          filter: { id: /./ },
        },
      },
    }

    await transform.call(mockLoaderContext as any, source, map)

    expect(handlerMock).toHaveBeenCalled()
    expect(mockCallback).toHaveBeenCalledWith(error)
  })

  it('should include input source map on native build context', async () => {
    const source = 'source code'
    const map = originalMap
    const transformedCode = 'transformed code'

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
          filter: { id: /./ },
        },
      },
    }

    await transform.call(mockLoaderContext as any, source, map)

    expect(handlerMock).toHaveBeenCalled()
    expect(handlerSource).toBe(source)
    expect(handlerId).toBe(mockLoaderContext.resource)
    assert(handlerNativeBuildContext?.framework === 'webpack')
    expect(handlerNativeBuildContext?.inputSourceMap).toBe(map)

    expect(mockCallback).toHaveBeenCalledWith(null, transformedCode, composedMap)
  })

  describe('source map of a transformed result', () => {
    async function run(map: any, context: object = {}, result: any = transformedMap) {
      mockLoaderContext.query = {
        plugin: {
          transform: {
            handler: vi.fn().mockResolvedValue({ code: 'transformed code', map: result }),
            filter: { id: /./ },
          },
        },
      }
      await transform.call({
        ...mockLoaderContext,
        ...context,
      } as any, 'source code', map)
    }

    it('is passed on when there is no input source map', async () => {
      await run(null)
      expect(mockCallback).toHaveBeenLastCalledWith(null, 'transformed code', transformedMap)
    })

    it('is composed with the input source map', async () => {
      await run(originalMap)
      expect(mockCallback).toHaveBeenLastCalledWith(null, 'transformed code', composedMap)
    })

    it('is dropped when source maps are disabled', async () => {
      await run(null, { sourceMap: false })
      expect(mockCallback).toHaveBeenLastCalledWith(null, 'transformed code', null)
    })

    it('keeps the transformed map when the input source map is empty', async () => {
      await run({
        version: 3,
        names: [],
        sources: [],
        mappings: '',
      })
      expect(mockCallback).toHaveBeenLastCalledWith(null, 'transformed code', transformedMap)
    })

    it('composes a transformed map with multiple sources', async () => {
      await run(originalMap, { resource: '/project/original.ts' }, multiSourceMap)
      expect(mockCallback).toHaveBeenLastCalledWith(null, 'transformed code', expect.objectContaining({
        sources: ['original.ts', 'other.ts'],
        mappings: 'AACA,CCDA',
      }))
    })
  })

  it('should be a raw loader so binary files are not decoded as text', () => {
    expect(raw).toBe(true)
  })

  it('should pass a binary source on untouched when the filter does not match', async () => {
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
    const handler = vi.fn()
    mockLoaderContext.query = {
      plugin: {
        transform: {
          handler,
          filter: { id: /\.never-matches$/ },
        },
      },
    }

    await transform.call(mockLoaderContext as any, png, undefined)

    expect(handler).not.toHaveBeenCalled()
    const [, passedSource] = mockCallback.mock.calls.at(-1)!
    expect(Buffer.isBuffer(passedSource) && passedSource.equals(png)).toBe(true)
  })

  it('should give the handler the source as a string when it receives a Buffer', async () => {
    const handler = vi.fn().mockResolvedValue('transformed')
    mockLoaderContext.query = {
      plugin: {
        transform: {
          handler,
          filter: { id: /./ },
        },
      },
    }

    await transform.call(mockLoaderContext as any, Buffer.from('const a = 1'), undefined)

    expect(handler).toHaveBeenCalledWith('const a = 1', '/path/to/resource')
    expect(mockCallback).toHaveBeenLastCalledWith(null, 'transformed', undefined)
  })
})
