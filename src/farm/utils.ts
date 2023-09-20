import path from 'node:path'

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
