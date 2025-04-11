import { describe, expect, it, vi } from 'vitest'
import load from '../../../../src/rspack/loaders/load'

describe('load', () => {
  it('should call callback with source and map when plugin.load is not defined', async () => {
    const asyncMock = vi.fn()
    const query = { plugin: {} }
    await load.call({ async: () => asyncMock, query } as any, 'source', 'map')

    expect(asyncMock).toHaveBeenCalledWith(null, 'source', 'map')
  })

  it('should call callback with transformed code and map when handler returns an object', async () => {
    const asyncMock = vi.fn()
    const handlerMock = vi.fn().mockResolvedValue({ code: 'transformedCode', map: 'transformedMap' })
    const query = {
      plugin: {
        load: handlerMock,
      },
    }

    await load.call(
      {
        async: () => asyncMock,
        query,
        resource: 'resourceId',
      } as any,
      'source',
      'map',
    )

    expect(handlerMock).toHaveBeenCalled()
    expect(asyncMock).toHaveBeenCalledWith(null, 'transformedCode', 'transformedMap')
  })

  it('should call callback with transformed code when handler returns a string', async () => {
    const asyncMock = vi.fn()
    const handlerMock = vi.fn().mockResolvedValue('transformedCode')
    const query = {
      plugin: {
        load: handlerMock,
      },
    }

    await load.call(
      {
        async: () => asyncMock,
        query,
        resource: 'resourceId',
      } as any,
      'source',
      'map',
    )

    expect(handlerMock).toHaveBeenCalled()
    expect(asyncMock).toHaveBeenCalledWith(null, 'transformedCode', 'map')
  })

  it('should call callback with source and map when handler returns null', async () => {
    const asyncMock = vi.fn()
    const handlerMock = vi.fn().mockResolvedValue(null)
    const query = {
      plugin: {
        load: handlerMock,
      },
    }

    await load.call(
      {
        async: () => asyncMock,
        query,
        resource: 'resourceId',
      } as any,
      'source',
      'map',
    )

    expect(handlerMock).toHaveBeenCalled()
    expect(asyncMock).toHaveBeenCalledWith(null, 'source', 'map')
  })

  it('should call callback with source and map when handler returns object', async () => {
    const asyncMock = vi.fn()
    const handlerMock = vi.fn().mockResolvedValue({
      code: 'code',
      map: 'resmap',
    })
    const query = {
      plugin: {
        load: handlerMock,
      },
    }

    await load.call(
      {
        async: () => asyncMock,
        query,
        resource: 'resourceId',
      } as any,
      'source',
      'map',
    )

    expect(handlerMock).toHaveBeenCalled()
    expect(asyncMock).toHaveBeenCalledWith(null, 'code', 'resmap')
  })
})
