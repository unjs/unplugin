import pkg from '../package.json' with { type: 'json' }

export const version: string = pkg.version

export * from './define'
export * from './types'
export { setParseImpl } from './utils/parse'
