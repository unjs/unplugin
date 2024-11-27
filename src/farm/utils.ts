import path, { normalize } from 'path'
import * as querystring from 'querystring'

export * from '../utils'

export type WatchChangeEvents = 'create' | 'update' | 'delete'

const ExtToLoader: Record<string, string> = {
  '.js': 'js',
  '.mjs': 'js',
  '.cjs': 'js',
  '.jsx': 'jsx',
  '.ts': 'ts',
  '.cts': 'ts',
  '.mts': 'ts',
  '.tsx': 'tsx',
  '.json': 'json',
  '.toml': 'toml',
  '.text': 'text',
  '.wasm': 'wasm',
  '.napi': 'napi',
  '.node': 'napi',
}

export function guessIdLoader(id: string): string {
  return ExtToLoader[path.extname(id).toLowerCase()] || 'js'
}

export function transformQuery(context: any) {
  const queryParamsObject: Record<string, string | boolean> = {}
  context.query.forEach(([param, value]: string[]) => {
    queryParamsObject[param] = value
  })
  const transformQuery = querystring.stringify(queryParamsObject)
  context.resolvedPath = `${context.resolvedPath}?${transformQuery}`
}

export function convertEnforceToPriority(value: 'pre' | 'post' | undefined) {
  const defaultPriority = 100
  const enforceToPriority = {
    pre: 101,
    post: 99,
  }

  return enforceToPriority[value!] !== undefined
    ? enforceToPriority[value!]
    : defaultPriority
}

export function convertWatchEventChange(
  value: WatchChangeEvents,
): WatchChangeEvents {
  const watchEventChange = {
    Added: 'create',
    Updated: 'update',
    Removed: 'delete',
  } as unknown as { [key in WatchChangeEvents]: WatchChangeEvents }

  return watchEventChange[value]
}

export function isString(variable: unknown): variable is string {
  return typeof variable === 'string'
}

export function isObject(variable: unknown): variable is object {
  return typeof variable === 'object' && variable !== null
}

export function customParseQueryString(url: string | null) {
  if (!url)
    return []

  const queryString = url.split('?')[1]

  const parsedParams = querystring.parse(queryString)
  const paramsArray = []

  for (const key in parsedParams)
    paramsArray.push([key, parsedParams[key]])

  return paramsArray
}

export function encodeStr(str: string): string {
  const len = str.length
  if (len === 0)
    return str

  const firstNullIndex = str.indexOf('\0')
  if (firstNullIndex === -1)
    return str

  const result = Array.from({ length: len + countNulls(str, firstNullIndex) })

  let pos = 0
  for (let i = 0; i < firstNullIndex; i++) {
    result[pos++] = str[i]
  }

  for (let i = firstNullIndex; i < len; i++) {
    const char = str[i]
    if (char === '\0') {
      result[pos++] = '\\'
      result[pos++] = '0'
    }
    else {
      result[pos++] = char
    }
  }

  return result.join('')
}

export function decodeStr(str: string): string {
  const len = str.length
  if (len === 0)
    return str

  const firstIndex = str.indexOf('\\0')
  if (firstIndex === -1)
    return str

  const result = Array.from({ length: len - countBackslashZeros(str, firstIndex) })

  let pos = 0
  for (let i = 0; i < firstIndex; i++) {
    result[pos++] = str[i]
  }

  let i = firstIndex
  while (i < len) {
    if (str[i] === '\\' && str[i + 1] === '0') {
      result[pos++] = '\0'
      i += 2
    }
    else {
      result[pos++] = str[i++]
    }
  }

  return result.join('')
}

export function getContentValue(content: any): string {
  if (content === null || content === undefined) {
    throw new Error('Content cannot be null or undefined')
  }

  const strContent = typeof content === 'string'
    ? content
    : (content.code || '')

  return encodeStr(strContent)
}

function countNulls(str: string, startIndex: number): number {
  let count = 0
  const len = str.length
  for (let i = startIndex; i < len; i++) {
    if (str[i] === '\0')
      count++
  }
  return count
}

function countBackslashZeros(str: string, startIndex: number): number {
  let count = 0
  const len = str.length
  for (let i = startIndex; i < len - 1; i++) {
    if (str[i] === '\\' && str[i + 1] === '0') {
      count++
      i++
    }
  }
  return count
}

export function removeQuery(path: string) {
  const queryIndex = path.indexOf('?')
  if (queryIndex !== -1) {
    return path.slice(0, queryIndex)
  }
  return normalize(path.concat(''))
}

export function isStartsWithSlash(str: string) {
  return str?.startsWith('/')
}

export function appendQuery(id: string, query: [string, string][]): string {
  if (!query.length) {
    return id
  }

  return `${id}?${stringifyQuery(query)}`
}

export function stringifyQuery(query: [string, string][]) {
  if (!query.length) {
    return ''
  }

  let queryStr = ''

  for (const [key, value] of query) {
    queryStr += `${key}${value ? `=${value}` : ''}&`
  }

  return `${queryStr.slice(0, -1)}`
}
