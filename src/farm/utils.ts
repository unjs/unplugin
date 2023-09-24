import path from 'node:path'
import * as querystring from 'node:querystring'
import type { TransformResult } from 'src/types'

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

export function resolveQuery(url: string) {
  return querystring.parse(new URL(url).search.slice(1))
}

export function getContentValue(content: TransformResult): string {
  return typeof content === 'string' ? content : content!.code
}
