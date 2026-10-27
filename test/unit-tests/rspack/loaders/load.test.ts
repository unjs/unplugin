import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import load, { raw } from '../../../../src/rspack/loaders/load'

describe('load', () => {
  it('should call callback with source and map when plugin.load is not defined', async () => {
    const asyncMock = vi.fn()
    const query = { plugin: {} }
    await load.call({
      async: () => asyncMock,
      query,
    } as any, 'source', 'map')

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

  it('should be a raw loader so binary files are not decoded as text', () => {
    expect(raw).toBe(true)
  })

  it('should pass a binary source on untouched when the load hook does not handle it', async () => {
    const asyncMock = vi.fn()
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
    const query = {
      plugin: {
        load: vi.fn().mockResolvedValue(null),
      },
    }

    await load.call(
      {
        async: () => asyncMock,
        query,
        resource: '/virtual/image.png',
      } as any,
      png,
      undefined,
    )

    const [, passedSource] = asyncMock.mock.calls.at(-1)!
    expect(Buffer.isBuffer(passedSource) && passedSource.equals(png)).toBe(true)
  })
})
