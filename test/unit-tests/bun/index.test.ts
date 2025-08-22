import { createUnplugin } from 'unplugin'
import { describe, expect, it } from 'vitest'

describe('bun plugin', () => {
  it('should export bun plugin', () => {
    const unplugin = createUnplugin(() => ({
      name: 'test-plugin',
    }))

    expect(unplugin.bun).toBeDefined()
    expect(typeof unplugin.bun).toBe('function')
  })

  it('should create bun plugin with correct name', () => {
    const unplugin = createUnplugin(() => ({
      name: 'test-plugin',
    }))

    const bunPlugin = unplugin.bun()
    expect(bunPlugin.name).toBe('test-plugin')
    expect(bunPlugin.setup).toBeDefined()
    expect(typeof bunPlugin.setup).toBe('function')
  })

  it('should handle options correctly', () => {
    interface Options {
      value: string
    }

    const unplugin = createUnplugin<Options>(options => ({
      name: 'test-plugin',
      buildStart() {
        expect(options.value).toBe('test')
      },
    }))

    const bunPlugin = unplugin.bun({ value: 'test' })
    expect(bunPlugin).toBeDefined()
  })

  it('should support multiple plugins with host name', () => {
    const unplugin = createUnplugin(() => [
      { name: 'plugin-1' },
      { name: 'plugin-2' },
    ])

    const bunPlugin = unplugin.bun()
    expect(bunPlugin.name).toBe('unplugin-host:plugin-1:plugin-2')
    expect(bunPlugin.setup).toBeDefined()
  })
})
