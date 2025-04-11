import { describe, expect, it, vi } from 'vitest'
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

    vi.mock('../../../../src/utils/filter', () => ({
      normalizeObjectHook: vi.fn(() => ({ handler: vi.fn().mockRejectedValue(new Error('Handler error')), filter: vi.fn().mockReturnValue(true) })),
    }))

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

    vi.mock('../../../../src/utils/filter', () => ({
      normalizeObjectHook: vi.fn(() => ({ handler: vi.fn().mockRejectedValue(new Error('Handler error')), filter: vi.fn().mockReturnValue(true) })),
    }))

    await transform.call(mockLoaderContext, source, map)

    expect(mockCallback).toHaveBeenCalledWith(expect.any(Error))
    expect(mockCallback.mock.calls[0][0].message).toBe('Handler error')
  })
})
