import type { Plugin } from 'rolldown'
import type { TopLevelFilterExpression } from 'unplugin/utils/filters'
import * as path from 'node:path'
import { and, code, exclude, id, importerId, include, not, or, query } from 'unplugin/utils/filters'
import { describe, expect, it } from 'vitest'
import { normalizeObjectHook } from '../../../src/utils/filter'
import { build } from '../utils'

// Unplugin evaluates composable filters itself on every bundler but Rolldown,
// so its results must match what Rolldown does natively for the same module graph.

const root = path.resolve(__dirname, 'parity-src')

// Rolldown can't load `?query` ids on its own
const queryResolver: Plugin = {
  name: 'query-resolver',
  resolveId(source, importer) {
    if (source.includes('?') && importer)
      return path.resolve(path.dirname(importer), source)
  },
  load(id) {
    if (id.includes('?'))
      return 'export default 0'
  },
}

async function bundle(plugin: Plugin, first = false): Promise<void> {
  await build.rolldown({
    input: path.join(root, 'entry.js'),
    logLevel: 'silent',
    plugins: first
      ? [plugin, queryResolver]
      : [queryResolver, plugin],
  })
}

const idCases: Record<string, TopLevelFilterExpression[]> = {
  'absolute glob': [
    include(id(`${root}/**/*.js`)),
  ],
  'relative glob': [
    include(id(`${path.relative(process.cwd(), root)}/nested/*.js`)),
  ],
  'globstar glob': [
    include(id('**/mod.js')),
  ],
  'glob with cleanUrl': [
    include(id('**/mod.js', { cleanUrl: true })),
  ],
  'exact path': [
    include(id(path.join(root, 'mod.js'))),
  ],
  'regex': [
    include(id(/mod\.js$/)),
  ],
  'regex with cleanUrl': [
    include(id(/mod\.js$/, { cleanUrl: true })),
  ],
  'query presence': [
    include(query('raw', true)),
  ],
  'query absence': [
    include(query('raw', false)),
  ],
  'query value': [
    include(query('x', '1')),
  ],
  'query regex': [
    include(query('x', /^\d$/)),
  ],
  'exclude only': [
    exclude(id(/nested/)),
  ],
  'first match wins': [
    include(id(/mod/)),
    exclude(id(/mod/)),
  ],
  'and / or / not': [
    include(and(or(id(/mod/), id(/deep/)), not(query('raw', true)))),
  ],
  'empty': [],
}

const transformCases: Record<string, TopLevelFilterExpression[]> = {
  ...idCases,
  'code string': [
    include(code('42')),
  ],
  'code regex': [
    include(code(/export default '\w+'/)),
  ],
  'id and code': [
    exclude(id(/nested/)),
    include(and(id(/\.js/), not(code('42')))),
  ],
}

const resolveIdCases: Record<string, TopLevelFilterExpression[]> = {
  'regex': [
    include(id(/^\.\/mod/)),
  ],
  'query': [
    include(query('raw', true)),
  ],
  'importer glob': [
    include(importerId('**/entry.js')),
  ],
  'importer regex': [
    include(importerId(/entry\.js$/)),
  ],
  'not importer': [
    include(not(importerId(/entry\.js$/))),
  ],
}

describe('composable filter parity with Rolldown', async () => {
  const modules: { id: string, code: string }[] = []
  await bundle({
    name: 'collect',
    transform(code, id) { modules.push({ id, code }) },
  })

  const resolves: { source: string, importer: string | undefined }[] = []
  await bundle({
    name: 'collect',
    resolveId(source, importer) { resolves.push({ source, importer }) },
  }, true)

  it('covers modules with and without queries', () => {
    expect(modules.map(m => path.relative(root, m.id))).toEqual(expect.arrayContaining(['mod.js?raw&x=1', 'mod.js', 'nested/deep.js']))
  })

  it.each(Object.entries(transformCases))('transform: %s', async (_, filter) => {
    const seen: string[] = []
    await bundle({
      name: 'native',
      transform: {
        filter,
        handler(_code, id) { seen.push(id) },
      },
    })

    const { filter: evaluate } = normalizeObjectHook('transform', {
      filter,
      handler() {},
    })
    expect(modules.filter(m => evaluate(m.id, m.code)).map(m => m.id).sort()).toEqual(seen.sort())
  })

  it.each(Object.entries(idCases))('load: %s', async (_, filter) => {
    const seen: string[] = []
    await bundle({
      name: 'native',
      load: {
        filter,
        handler(id) { seen.push(id) },
      },
    }, true)

    const { filter: evaluate } = normalizeObjectHook('load', {
      filter,
      handler() {},
    })
    // Rolldown emits a runtime module that never reaches `load`
    const loaded = modules.filter(m => !m.id.startsWith('\0'))
    expect(loaded.filter(m => evaluate(m.id)).map(m => m.id).sort()).toEqual(seen.sort())
  })

  it.each(Object.entries(resolveIdCases))('resolveId: %s', async (_, filter) => {
    const seen: string[] = []
    await bundle({
      name: 'native',
      resolveId: {
        filter,
        handler(source) { seen.push(source) },
      },
    }, true)

    const { filter: evaluate } = normalizeObjectHook('resolveId', {
      filter,
      handler() {},
    })
    expect(resolves.filter(r => evaluate(r.source, r.importer)).map(r => r.source).sort()).toEqual(seen.sort())
  })

  async function expectSameError(hook: 'resolveId' | 'load' | 'transform', filter: TopLevelFilterExpression[], evaluate: () => void) {
    const message = await bundle({
      name: 'native',
      [hook]: {
        filter,
        handler() {},
      },
    }).then(() => '', (error: Error) => error.message)
    expect(message).not.toBe('')
    expect(evaluate).toThrow(`[unplugin] ${message}`)
  }

  it('rejects a string `id` in resolveId like Rolldown', async () => {
    const filter = [
      include(id('./mod.js')),
    ]
    await expectSameError('resolveId', filter, () => normalizeObjectHook('resolveId', {
      filter,
      handler() {},
    }))
  })

  it('rejects `importerId` outside resolveId like Rolldown', async () => {
    const filter = [
      include(importerId(/entry/)),
    ]
    await expectSameError('load', filter, () => normalizeObjectHook('load', {
      filter,
      handler() {},
    }))
    await expectSameError('transform', filter, () => normalizeObjectHook('transform', {
      filter,
      handler() {},
    }))
  })
})
