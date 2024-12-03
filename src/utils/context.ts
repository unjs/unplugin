import { Parser, type Program } from 'acorn'

export function parse(code: string, opts: any = {}): Program {
  return Parser.parse(code, {
    sourceType: 'module',
    ecmaVersion: 'latest',
    locations: true,
    ...opts,
  })
}
