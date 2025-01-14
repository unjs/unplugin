import type { JsPlugin } from '@farmfe/core'

import path from 'node:path'
import * as querystring from 'node:querystring'

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

export const DEFAULT_PATTERN = '.*'

export function guessIdLoader(id: string): string {
  return ExtToLoader[path.extname(id).toLowerCase()] || 'js'
}

export function transformQuery(context: any): void {
  const queryParamsObject: Record<string, string | boolean> = {}
  context.query.forEach(([param, value]: string[]) => {
    queryParamsObject[param] = value
  })
  const transformQuery = querystring.stringify(queryParamsObject)
  context.resolvedPath = `${context.resolvedPath}?${transformQuery}`
}

export function convertEnforceToPriority(value: 'pre' | 'post' | undefined): number {
  const defaultPriority = 100
  const enforceToPriority = {
    pre: 102,
    post: 98,
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

export function customParseQueryString(url: string | null): [string, string][] {
  if (!url)
    return []

  const queryString = url.split('?')[1]

  const parsedParams = querystring.parse(queryString)
  const paramsArray: [string, string][] = []

  for (const key in parsedParams)
    paramsArray.push([key, parsedParams[key] as string])

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

  return path.posix.normalize(result.join(''))
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

  return path.posix.normalize(result.join(''))
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

export function removeQuery(pathe: string): string {
  const queryIndex = pathe.indexOf('?')
  if (queryIndex !== -1) {
    return path.posix.normalize(pathe.slice(0, queryIndex))
  }
  return path.posix.normalize(pathe)
}

export function isStartsWithSlash(str: string): boolean {
  return str?.startsWith('/')
}

export function appendQuery(id: string, query: [string, string][]): string {
  if (!query.length) {
    return id
  }

  return `${id}?${stringifyQuery(query)}`
}

export function stringifyQuery(query: [string, string][]): string {
  if (!query.length) {
    return ''
  }

  let queryStr = ''

  for (const [key, value] of query) {
    queryStr += `${key}${value ? `=${value}` : ''}&`
  }

  return `${queryStr.slice(0, -1)}`
}

export interface JsPluginExtended extends JsPlugin {
  [key: string]: any
}

export const CSS_LANGS_RES: [RegExp, string][] = [
  [/\.(less)(?:$|\?)/, 'less'],
  [/\.(scss|sass)(?:$|\?)/, 'sass'],
  [/\.(styl|stylus)(?:$|\?)/, 'stylus'],
  [/\.(css)(?:$|\?)/, 'css'],
]

export const JS_LANGS_RES: [RegExp, string][] = [
  [/\.(js|mjs|cjs)(?:$|\?)/, 'js'],
  // jsx
  [/\.(jsx)(?:$|\?)/, 'jsx'],
  // ts
  [/\.(ts|cts|mts)(?:$|\?)/, 'ts'],
  // tsx
  [/\.(tsx)(?:$|\?)/, 'tsx'],
]

export function getCssModuleType(id: string): string | null {
  for (const [reg, lang] of CSS_LANGS_RES) {
    if (reg.test(id)) {
      return lang
    }
  }

  return null
}

export function getJsModuleType(id: string): string | null {
  for (const [reg, lang] of JS_LANGS_RES) {
    if (reg.test(id)) {
      return lang
    }
  }

  return null
}

export function formatLoadModuleType(id: string): string {
  const cssModuleType = getCssModuleType(id)

  if (cssModuleType) {
    return cssModuleType
  }

  const jsModuleType = getJsModuleType(id)

  if (jsModuleType) {
    return jsModuleType
  }

  return 'js'
}

export function formatTransformModuleType(id: string): string {
  return formatLoadModuleType(id)
}
