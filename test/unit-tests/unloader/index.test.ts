import type { UnloaderPlugin } from '../../../src/types'
import { describe, expect, it, vi } from 'vitest'
import { getUnloaderPlugin } from '../../../src/unloader/index'

describe('getUnloaderPlugin', () => {
  it('should return a function', () => {
    const factory = vi.fn()
    const plugin = getUnloaderPlugin(factory)
    expect(typeof plugin).toBe('function')
  })

  it('should call the factory function with the correct arguments', () => {
    const factory = vi.fn()
    const plugin = getUnloaderPlugin(factory)
    plugin({ foo: 'bar' })
    expect(factory).toHaveBeenCalledWith({ foo: 'bar' }, expect.objectContaining({
      framework: 'unloader',
      versions: expect.objectContaining({ unplugin: expect.any(String) }),
    }))
  })

  it('should return an array of plugins if multiple plugins are returned', () => {
    const factory = vi.fn(() => [() => {}, () => {}])
    const plugin = getUnloaderPlugin(factory)
    const result = plugin({}) as UnloaderPlugin<any>[]
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)
  })

  it('should return a single plugin if only one is returned', () => {
    const factory = vi.fn(() => () => {})
    const plugin = getUnloaderPlugin(factory)
    const result = plugin({})
    expect(typeof result).toBe('function')
  })
})
