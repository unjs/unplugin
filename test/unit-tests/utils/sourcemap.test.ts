import { describe, expect, it } from 'vitest'
import { mergeSourceMaps } from '../../../src/utils/sourcemap'

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
const emptyMap = {
  version: 3,
  names: [],
  sources: [],
  mappings: '',
}
const composed = expect.objectContaining({
  sources: ['original.ts'],
  sourcesContent: ['original source'],
  mappings: ';AACA',
})

describe('mergeSourceMaps', () => {
  it('passes the input map on when there is no transformed map', () => {
    expect(mergeSourceMaps(undefined, originalMap)).toBe(originalMap)
    expect(mergeSourceMaps(null, originalMap)).toBe(originalMap)
  })

  it('passes the transformed map on when there is no input map', () => {
    expect(mergeSourceMaps(transformedMap, undefined)).toBe(transformedMap)
  })

  it('keeps the transformed map when the input map is empty', () => {
    expect(mergeSourceMaps(transformedMap, emptyMap)).toBe(transformedMap)
    expect(mergeSourceMaps(transformedMap, JSON.stringify(emptyMap))).toBe(transformedMap)
  })

  it('keeps the input map when the transformed map is empty', () => {
    expect(mergeSourceMaps(emptyMap, originalMap)).toBe(originalMap)
    expect(mergeSourceMaps({ mappings: '' }, originalMap)).toBe(originalMap)
    expect(mergeSourceMaps(JSON.stringify(emptyMap), originalMap)).toBe(originalMap)
  })

  it('composes the two maps', () => {
    expect(mergeSourceMaps(transformedMap, originalMap)).toEqual(composed)
    expect(mergeSourceMaps(JSON.stringify(transformedMap), originalMap)).toEqual(composed)
    expect(mergeSourceMaps(transformedMap, JSON.stringify(originalMap))).toEqual(composed)
  })

  it('traces only the transformed module in a multi-source map', () => {
    expect(mergeSourceMaps(multiSourceMap, originalMap, '/project/original.ts')).toEqual(expect.objectContaining({
      sources: ['original.ts', 'other.ts'],
      mappings: 'AACA,CCDA',
    }))
  })

  it('matches the resource through backslashes and a query', () => {
    expect(mergeSourceMaps(multiSourceMap, originalMap, 'C:\\project\\original.ts?query')).toEqual(expect.objectContaining({
      sources: ['original.ts', 'other.ts'],
      mappings: 'AACA,CCDA',
    }))
  })
})
