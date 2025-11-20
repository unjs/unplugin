import type { NativeBuildContext, UnpluginBuildContext } from '../../../../src/types'
import { assert, describe, expect, it, vi } from 'vitest'
import transform from '../../../../src/rspack/loaders/transform'

describe('transform', () => {
  it('should call callback with source and map if plugin.transform is not defined', async () => {
    const mockCallback = vi.fn()
    const mockLoaderContext = {
      async: () => mockCallback,
      query: {},
    } as any

    const source = 'test source'
    const map = 'test map'

    await transform.call(mockLoaderContext, source, map)

    expect(mockCallback).toHaveBeenCalledWith(null, source, map)
  })

  it('should call callback with an error if handler throws an error', async () => {
    const mockCallback = vi.fn()
    const mockLoaderContext = {
      async: () => mockCallback,
      query: {
        plugin: {
          transform: {
            handler: vi.fn().mockRejectedValue(new Error('Handler error')),
            filter: vi.fn().mockReturnValue(true),
          },
        },
      },
      resource: 'test resource',
    } as any

    const source = 'test source'
    const map = 'test map'

    await transform.call(mockLoaderContext, source, map)

    expect(mockCallback).toHaveBeenCalledWith(expect.any(Error))
    expect(mockCallback.mock.calls[0][0].message).toBe('Handler error')
  })

  it('should call callback with an error if handler throws string', async () => {
    const mockCallback = vi.fn()
    const mockLoaderContext = {
      async: () => mockCallback,
      query: {
        plugin: {
          transform: {
            handler: vi.fn().mockRejectedValue('Handler error'),
            filter: vi.fn().mockReturnValue(true),
          },
        },
      },
      resource: 'test resource',
    } as any

    const source = 'test source'
    const map = 'test map'

    await transform.call(mockLoaderContext, source, map)

    expect(mockCallback).toHaveBeenCalledWith(expect.any(Error))
    expect(mockCallback.mock.calls[0][0].message).toBe('Handler error')
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

    const mockCallback = vi.fn()
    const mockLoaderContext = {
      async: () => mockCallback,
      query: {
        plugin: {
          transform: {
            handler: handlerMock,
            filter: vi.fn().mockReturnValue(true),
          },
        },
      },
      resource: 'test resource',
      addDependency: vi.fn(),
      getDependencies: vi.fn().mockReturnValue(['/path/to/dependency']),
      _compiler: {},
      _compilation: {},
    } as any

    await transform.call(mockLoaderContext as any, source, map)

    expect(handlerMock).toHaveBeenCalled()
    expect(handlerSource).toBe(source)
    expect(handlerId).toBe(mockLoaderContext.resource)
    assert(handlerNativeBuildContext?.framework === 'rspack')
    expect(handlerNativeBuildContext?.inputSourceMap).toBe(map)

    expect(mockCallback).toHaveBeenCalledWith(null, transformedCode, transformedMap)
  })
})
