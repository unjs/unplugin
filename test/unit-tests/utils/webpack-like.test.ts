import type { ResolvedUnpluginOptions } from '../../../src/types'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createCachedIdFilter, normalizeAbsolutePath, transformUse, unescapeResourcePath } from '../../../src/utils/webpack-like'

describe('normalizeAbsolutePath', () => {
  it('leaves relative ids alone and normalizes absolute ones', () => {
    expect(normalizeAbsolutePath('./a/../b.js')).toBe('./a/../b.js')
    expect(normalizeAbsolutePath(path.resolve('/a/./b/../c.js'))).toBe(path.resolve('/a/c.js'))
  })
})

describe('unescapeResourcePath', () => {
  it('removes each bundler\'s own escape character only', () => {
    expect(unescapeResourcePath('/a/msg\0#hash.js', 'webpack')).toBe('/a/msg#hash.js')
    expect(unescapeResourcePath('/a/msg\u200B#hash.js', 'rspack')).toBe('/a/msg#hash.js')
    expect(unescapeResourcePath('/a/msg\u200B#hash.js', 'webpack')).toBe('/a/msg\u200B#hash.js')
  })
})

describe('transformUse', () => {
  const plugin = { name: 'test', __virtualModulePrefix: '/virtual' } as ResolvedUnpluginOptions
  const use = {
    loader: '/loader.mjs',
    options: { plugin },
    ident: 'test',
  }

  it('returns no loader without a resource', () => {
    expect(transformUse({}, plugin, '/loader.mjs', () => true)).toEqual([])
  })

  it('returns the loader when the filter accepts the resource and query', () => {
    const filter = vi.fn(() => true)
    const resource = path.resolve('/a/mod.js')
    expect(transformUse({ resource, resourceQuery: '?q' }, plugin, '/loader.mjs', filter)).toEqual([use])
    expect(filter).toHaveBeenCalledWith(`${resource}?q`)
  })

  it('returns no loader when the filter or transformInclude rejects', () => {
    expect(transformUse({ resource: '/a/mod.js' }, plugin, '/loader.mjs', () => false)).toEqual([])
    const excluding = {
      ...plugin,
      transformInclude: () => false,
    }
    expect(transformUse({ resource: '/a/mod.js' }, excluding, '/loader.mjs', () => true)).toEqual([])
  })
})

describe('createCachedIdFilter', () => {
  it('normalizes a hook once and again when the hook object changes', () => {
    let reads = 0
    let hook = {
      get filter() {
        reads++
        return { id: /\.js$/ }
      },
      handler: () => {},
    }
    const filter = createCachedIdFilter(() => hook)

    expect(filter('/a/mod.js')).toBe(true)
    expect(filter('/a/mod.ts')).toBe(false)
    expect(reads).toBe(1)

    hook = {
      get filter() {
        reads++
        return { id: /\.ts$/ }
      },
      handler: () => {},
    }
    expect(filter('/a/mod.ts')).toBe(true)
    expect(reads).toBe(2)
  })
})
