import type { StringFilter } from '../../../src/types'
import { mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { normalizeObjectHook } from '../../../src/utils/filter'

function idFilter(id: StringFilter) {
  return normalizeObjectHook('load', {
    handler: () => {},
    filter: { id },
  }).filter
}

describe('id filters', () => {
  // Glob metacharacters in the project path must not change what a relative pattern matches
  const originalCwd = process.cwd()
  let cwd: string

  beforeAll(() => {
    // realpath, because on macOS the tmpdir is a symlink and process.cwd() reports the target
    cwd = realpathSync(mkdtempSync(join(tmpdir(), 'unplugin (1) [id] {x}-')))
    process.chdir(cwd)
  })

  afterAll(() => {
    process.chdir(originalCwd)
    rmSync(cwd, { recursive: true, force: true })
  })

  it('resolves relative globs against a cwd with metacharacters', () => {
    const filter = idFilter('src/*.js')
    expect(filter(join(cwd, 'src/mod.js'))).toBe(true)
    expect(filter(join(cwd, 'src/nested/mod.js'))).toBe(false)
    expect(filter(join(cwd, 'other/mod.js'))).toBe(false)
  })

  it('resolves ./ relative globs the same way', () => {
    expect(idFilter('./src/*.js')(join(cwd, 'src/mod.js'))).toBe(true)
  })

  it('matches ** globs anywhere', () => {
    const filter = idFilter('**/mod.js')
    expect(filter(join(cwd, 'deep/er/mod.js'))).toBe(true)
    expect(filter('/elsewhere/mod.js')).toBe(true)
  })

  it('uses absolute globs as is', () => {
    const filter = idFilter('/elsewhere/src/*.js')
    expect(filter('/elsewhere/src/mod.js')).toBe(true)
    expect(filter(join(cwd, 'src/mod.js'))).toBe(false)
  })

  it('matches a global RegExp repeatedly', () => {
    const filter = idFilter(/\.js$/g)
    expect(filter('/a/mod.js')).toBe(true)
    expect(filter('/a/mod.js')).toBe(true)
  })

  it('lets exclude win over include and matches everything with an empty include', () => {
    const filter = normalizeObjectHook('load', {
      handler: () => {},
      filter: {
        id: {
          include: [/\.js$/],
          exclude: ['**/skip.js'],
        },
      },
    }).filter
    expect(filter('/a/mod.js')).toBe(true)
    expect(filter('/a/skip.js')).toBe(false)
    expect(filter('/a/mod.ts')).toBe(false)

    expect(idFilter({ include: [] })('/anything')).toBe(true)
  })
})
