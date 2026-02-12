import type { RolldownPlugin } from '../../../src/types'
import { describe, expect, it, vi } from 'vitest'
import { getRolldownPlugin } from '../../../src/rolldown/index'

describe('getRolldownPlugin', () => {
  it('should return a function', () => {
    const factory = vi.fn()
    const plugin = getRolldownPlugin(factory)
    expect(typeof plugin).toBe('function')
  })

  it('should call the factory function with the correct arguments', () => {
    const factory = vi.fn()
    const plugin = getRolldownPlugin(factory)
    plugin({ foo: 'bar' })
    expect(factory).toHaveBeenCalledWith({ foo: 'bar' }, expect.objectContaining({
      framework: 'rolldown',
      versions: expect.objectContaining({ unplugin: expect.any(String) }),
    }))
  })

  it('should return an array of plugins if multiple plugins are returned', () => {
    const factory = vi.fn(() => [() => {}, () => {}])
    const plugin = getRolldownPlugin(factory)
    const result = plugin({}) as RolldownPlugin<any>[]
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)
  })

  it('should return a single plugin if only one is returned', () => {
    const factory = vi.fn(() => () => {})
    const plugin = getRolldownPlugin(factory)
    const result = plugin({})
    expect(typeof result).toBe('function')
  })
})
