import { Parser } from 'acorn'

export function parse(code: string, opts: any = {}) {
  return Parser.parse(code, {
    sourceType: 'module',
    ecmaVersion: 'latest',
    locations: true,
    ...opts,
  })
}
