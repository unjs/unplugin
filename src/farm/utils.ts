import path from 'node:path'
import * as querystring from 'node:querystring'

export * from '../utils'

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
