import { describe, expect, it } from 'vitest'
import {
  appendQuery,
  convertEnforceToPriority,
  convertWatchEventChange,
  customParseQueryString,
  decodeStr,
  encodeStr,
  formatLoadModuleType,
  formatTransformModuleType,
  getContentValue,
  getCssModuleType,
  getJsModuleType,
  guessIdLoader,
  isObject,
  isStartsWithSlash,
  isString,
  removeQuery,
  stringifyQuery,
  transformQuery,
} from '../../../src/farm/utils'

describe('utils.ts', () => {
  it('guessIdLoader should return correct loader based on file extension', () => {
    expect(guessIdLoader('file.js')).toBe('js')
    expect(guessIdLoader('file.ts')).toBe('ts')
    expect(guessIdLoader('file.unknown')).toBe('js')
  })

  it('transformQuery should append query string to resolvedPath', () => {
    const context = {
      query: [['key', 'value']],
      resolvedPath: '/path/to/file',
    }
    transformQuery(context)
    expect(context.resolvedPath).toBe('/path/to/file?key=value')
  })

  it('convertEnforceToPriority should return correct priority', () => {
    expect(convertEnforceToPriority('pre')).toBe(102)
    expect(convertEnforceToPriority('post')).toBe(98)
    expect(convertEnforceToPriority(undefined)).toBe(100)
  })

  it('convertWatchEventChange should map events correctly when Added', () => {
    const actual = convertWatchEventChange('Added' as any)
    expect(actual).toBe('create')
  })

  it('convertWatchEventChange should map events correctly when Updated', () => {
    const actual = convertWatchEventChange('Updated' as any)
    expect(actual).toBe('update')
  })

  it('convertWatchEventChange should map events correctly when Removed', () => {
    const actual = convertWatchEventChange('Removed' as any)
    expect(actual).toBe('delete')
  })

  it('isString should correctly identify strings', () => {
    expect(isString('test')).toBe(true)
    expect(isString(123)).toBe(false)
  })

  it('isObject should correctly identify objects', () => {
    expect(isObject({})).toBe(true)
    expect(isObject(null)).toBe(false)
    expect(isObject('string')).toBe(false)
  })

  it('customParseQueryString should parse query strings correctly', () => {
    expect(customParseQueryString('http://example.com?key=value')).toEqual([['key', 'value']])
    expect(customParseQueryString(null)).toEqual([])
  })

  it('encodeStr should encode null characters', () => {
    expect(encodeStr('hello\0world')).toBe('hello\\0world')
    expect(encodeStr('hello')).toBe('hello')
  })

  it('decodeStr should decode null characters', () => {
    expect(decodeStr('hello\\0world')).toBe('hello\0world')
    expect(decodeStr('hello')).toBe('hello')
  })

  it('getContentValue should return encoded content', () => {
    expect(getContentValue('test')).toBe('test')
    expect(getContentValue({ code: 'test' })).toBe('test')
    expect(() => getContentValue(null)).toThrow('Content cannot be null or undefined')
  })

  it('removeQuery should remove query string from path', () => {
    expect(removeQuery('/path/to/file?query=1')).toBe('/path/to/file')
    expect(removeQuery('/path/to/file')).toBe('/path/to/file')
  })

  it('isStartsWithSlash should check if string starts with a slash', () => {
    expect(isStartsWithSlash('/path')).toBe(true)
    expect(isStartsWithSlash('path')).toBe(false)
  })

  it('appendQuery should append query to id', () => {
    expect(appendQuery('id', [['key', 'value']])).toBe('id?key=value')
    expect(appendQuery('id', [])).toBe('id')
  })

  it('stringifyQuery should convert query array to string', () => {
    expect(stringifyQuery([['key', 'value']])).toBe('key=value')
    expect(stringifyQuery([])).toBe('')
  })

  it('getCssModuleType should return correct CSS module type', () => {
    expect(getCssModuleType('file.less')).toBe('less')
    expect(getCssModuleType('file.unknown')).toBe(null)
  })

  it('getJsModuleType should return correct JS module type', () => {
    expect(getJsModuleType('file.js')).toBe('js')
    expect(getJsModuleType('file.unknown')).toBe(null)
  })

  it('formatLoadModuleType should return correct module type', () => {
    expect(formatLoadModuleType('file.css')).toBe('css')
    expect(formatLoadModuleType('file.js')).toBe('js')
    expect(formatLoadModuleType('file.unknown')).toBe('js')
  })

  it('formatTransformModuleType should return correct module type', () => {
    expect(formatTransformModuleType('file.css')).toBe('css')
    expect(formatTransformModuleType('file.js')).toBe('js')
  })
})
