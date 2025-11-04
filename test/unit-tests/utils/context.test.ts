import { describe, expect, it } from 'vitest'
import { parse } from '../../../src/utils/parse'

describe('parse', () => {
  it('should parse valid JavaScript code', () => {
    const code = 'const x = 42;'
    const result = parse(code)
    expect(result).toBeDefined()
  })

  it('should throw an error for invalid JavaScript code', () => {
    const code = 'const x = ;'
    expect(() => parse(code)).toThrow()
  })

  it('should accept custom options', () => {
    const code = 'const x = 42;'
    const opts = { ecmaVersion: 2020 }
    const result = parse(code, opts)
    expect(result).toBeDefined()
  })
})
