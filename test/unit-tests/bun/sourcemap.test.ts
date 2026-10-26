import type { OnLoadArgs, OnLoadCallback, PluginBuilder } from 'bun'
import type { UnpluginOptions } from '../../../src/types'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { SourceMap } from 'node:module'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import MagicString, { Bundle } from 'magic-string'
import { createBunPlugin } from 'unplugin'
import { describe, expect, it } from 'vitest'

// Bun releases without https://github.com/oven-sh/bun/issues/6173 cannot compose input maps.
// Probe Bun directly so forwarding regressions still run on those releases.
const supportsInputMaps = typeof Bun !== 'undefined' && await probeInputMaps()

async function probeInputMaps() {
  const directory = await mkdtemp(join(tmpdir(), 'unplugin-bun-map-probe-'))
  const entry = join(directory, 'entry.js')
  const original = 'export const probeToken = 42\n'
  const source = new MagicString(original).prepend('\n')
  const map = source.generateMap({ source: entry, includeContent: true, hires: true })
  await writeFile(entry, `${source}\n//# sourceMappingURL=${map.toUrl()}`)
  try {
    const result = await Bun.build({
      entrypoints: [entry],
      target: 'bun',
      sourcemap: 'external',
    })
    if (!result.success) {
      throw new AggregateError(result.logs, 'Bun input source map probe failed')
    }
    const code = await result.outputs.find(output => output.kind === 'entry-point')!.text()
    const outputMap = JSON.parse(await result.outputs.find(output => output.kind === 'sourcemap')!.text())
    const before = code.slice(0, code.indexOf('probeToken')).split('\n')
    const position = new SourceMap(outputMap).findEntry(before.length - 1, before.at(-1)!.length)
    return 'originalLine' in position && position.originalLine === 0
      && outputMap.sourcesContent.includes(original)
  }
  finally {
    await rm(directory, { recursive: true, force: true })
  }
}

describe.skipIf(typeof Bun === 'undefined')('bun sourcemaps', () => {
  it('forwards composed hook maps to the Bun onLoad callback', async () => {
    const result = await load([
      transform('originalToken', 'intermediateToken', true),
      transform('intermediateToken', 'finalToken'),
    ])
    expectOriginal(result, 'finalToken', result.original)
  })

  const maplessKinds = [
    'string',
    'object',
    'null-map',
    'undefined-map',
  ] as const
  it.each(maplessKinds.flatMap(kind => [false, true].map(changed => ({ kind, changed }))))(
    'invalidates $kind maps only when code changes: $changed',
    async ({ kind, changed }) => {
      const result = await load([
        transform('originalToken', 'intermediateToken'),
        {
          name: 'mapless-transform',
          transform(code) {
            code = changed
              ? `\n${code.replace('intermediateToken', 'finalToken')}`
              : code
            return kind === 'string'
              ? code
              : kind === 'null-map'
                ? { code, map: null }
                : kind === 'undefined-map'
                  ? { code, map: undefined }
                  : { code }
          },
        },
      ])
      expect(result.code).toContain(changed ? 'finalToken' : 'intermediateToken')
      if (changed) {
        expect(result.map).toBeUndefined()
      }
      else {
        expectOriginal(result, 'intermediateToken', result.original)
      }
    },
  )

  it.each(maplessKinds)('starts a new map chain after a changed %s result', async (kind) => {
    let intermediate = ''
    const result = await load([
      transform('originalToken', 'intermediateToken'),
      {
        name: 'mapless-transform',
        transform(code) {
          intermediate = `\n${code.replace('intermediateToken', 'unmappedToken')}`
          return kind === 'string'
            ? intermediate
            : kind === 'null-map'
              ? { code: intermediate, map: null }
              : kind === 'undefined-map'
                ? { code: intermediate, map: undefined }
                : { code: intermediate }
        },
      },
      transform('unmappedToken', 'finalToken'),
    ])
    expectOriginal(result, 'finalToken', intermediate, 4)
  })

  async function load(plugins: UnpluginOptions[], original = '\n\nexport const originalToken = 42\n') {
    const directory = await mkdtemp(join(tmpdir(), 'unplugin-bun-map-'))
    const entry = join(directory, 'entry.js')
    await writeFile(entry, original)
    try {
      let onLoad: OnLoadCallback | undefined
      const plugin = createBunPlugin(() => plugins)()
      await plugin.setup({
        config: { sourcemap: 'external' },
        onLoad(_options, callback) {
          onLoad = callback
        },
      } as PluginBuilder)
      const result = await onLoad!({ path: entry, namespace: 'file', loader: 'js' } as OnLoadArgs)
      expect(result).toBeDefined()
      assert(result && 'contents' in result)
      assert(typeof result.contents === 'string')
      const code = result.contents
      const encodedMap = code.match(/\/\/# sourceMappingURL=data:application\/json[^,]*,([^\n]+)/)?.[1]
      const map = encodedMap
        ? JSON.parse(Buffer.from(encodedMap, 'base64').toString())
        : undefined
      return { code, map, original, entry }
    }
    finally {
      await rm(directory, { recursive: true, force: true })
    }
  }

  async function build(plugins: UnpluginOptions[], sourcemap?: 'external' | 'none' | false, filename = 'entry.js', original = '\n\nexport const originalToken = 42\n') {
    const directory = await mkdtemp(join(tmpdir(), 'unplugin-bun-map-'))
    const entry = join(directory, filename)
    await writeFile(entry, original)
    try {
      const result = await Bun.build({
        entrypoints: [entry],
        target: 'bun',
        sourcemap,
        plugins: [
          createBunPlugin(() => plugins)(),
        ],
      })
      expect(result.success).toBe(true)
      const output = result.outputs.find(output => output.kind === 'entry-point' || output.path.endsWith('.css'))!
      const map = result.outputs.find(output => output.kind === 'sourcemap')
      return {
        code: await output.text(),
        map: map && JSON.parse(await map.text()),
        original,
        entry,
      }
    }
    finally {
      await rm(directory, { recursive: true, force: true })
    }
  }

  function transform(from: string, to: string, asString = false): UnpluginOptions {
    return {
      name: `rename-${to}`,
      transform(code, id) {
        if (!code.includes(from)) {
          return null
        }
        const source = new MagicString(code)
        source.overwrite(code.indexOf(from), code.indexOf(from) + from.length, to)
        source.prepend('\n')
        const map = source.generateMap({ source: id, includeContent: true, hires: true })
        return {
          code: source.toString(),
          map: asString
            ? map.toString()
            : map,
        }
      },
    }
  }

  function expectOriginal(result: Awaited<ReturnType<typeof build>>, token: string, content: string, line = 2) {
    expect(result.map).toBeDefined()
    const offset = result.code.indexOf(token)
    expect(offset).toBeGreaterThanOrEqual(0)
    const before = result.code.slice(0, offset).split('\n')
    const position = new SourceMap(result.map).findEntry(before.length - 1, before.at(-1)!.length)
    assert('originalLine' in position)
    expect(position.originalLine).toBe(line)
    expect(position.originalColumn).toBe(13)
    expect(result.map.sourcesContent).toContain(content)
  }

  it.skipIf(!supportsInputMaps)('forwards a transform map', async () => {
    const result = await build([
      transform('originalToken', 'mappedToken'),
    ], 'external')
    expectOriginal(result, 'mappedToken', result.original)
  })

  it.skipIf(!supportsInputMaps)('composes string and object maps across multiple transforms', async () => {
    const result = await build([
      transform('originalToken', 'intermediateToken', true),
      {
        name: 'empty-transform',
        transform: () => null,
      },
      {
        name: 'string-transform',
        transform: code => code,
      },
      {
        name: 'null-map-transform',
        transform: code => ({ code, map: null }),
      },
      transform('intermediateToken', 'finalToken'),
    ], 'external')
    expectOriginal(result, 'finalToken', result.original)
  })

  it.skipIf(!supportsInputMaps)('composes a load map and a transform map', async () => {
    const original = '\n\nexport const originalToken = 42\n'
    const source = new MagicString(original)
    source.prepend('\n\n')
    const result = await build([
      {
        name: 'mapped-load',
        load(id) {
          return {
            code: source.toString(),
            map: source.generateMap({ source: id, includeContent: true, hires: true }).toString(),
          }
        },
      },
      transform('originalToken', 'finalToken'),
    ], 'external')
    expectOriginal(result, 'finalToken', original)
  })

  it.skipIf(!supportsInputMaps)('preserves a load map without transforms', async () => {
    const original = '\n\nexport const originalToken = 42\n'
    const source = new MagicString(original)
    source.prepend('\n\n')
    const result = await build([
      {
        name: 'load-only',
        load: () => ({
          code: source.toString(),
          map: source.generateMap({ source: 'original.js', includeContent: true, hires: true }),
        }),
      },
    ], 'external')
    expectOriginal(result, 'originalToken', original)
  })

  it.skipIf(!supportsInputMaps)('preserves file paths containing spaces, hash and percent characters', async () => {
    const result = await build([
      transform('originalToken', 'mappedToken'),
    ], 'external', 'entry #100%.js')
    expectOriginal(result, 'mappedToken', result.original)
    expect(result.map.sources.some((source: string) => source.includes('entry #100%.js'))).toBe(true)
  })

  it.skipIf(!supportsInputMaps).each([
    'absolute',
    'relative',
    'file-url',
    'source-root',
    'absolute-source-root',
    'relative-source-root',
  ] as const)('composes multi-source maps with %s paths', async (sourceKind) => {
    const original = '\n\nexport const originalToken = 42\n'
    const other = '\n\nexport const otherToken = 43\n'
    const result = await build([
      transform('originalToken', 'intermediateToken'),
      {
        name: 'multi-source',
        transform(code, id) {
          const source = new MagicString(code)
          source.overwrite(code.indexOf('intermediateToken'), code.indexOf('intermediateToken') + 'intermediateToken'.length, 'finalToken')
          const bundle = new Bundle()
          const filename = sourceKind === 'absolute'
            ? id
            : sourceKind === 'file-url'
              ? pathToFileURL(id).href
              : sourceKind === 'source-root'
                ? encodeURIComponent(basename(id))
                : basename(id)
          bundle.addSource({ filename, content: source })
          bundle.addSource({
            filename: 'other.js',
            content: new MagicString(other),
          })
          const map = bundle.generateMap({ includeContent: true, hires: true })
          return {
            code: bundle.toString(),
            map: {
              ...map,
              sourceRoot: sourceKind === 'source-root'
                ? pathToFileURL(`${dirname(id)}/`).href
                : sourceKind === 'absolute-source-root'
                  ? dirname(id)
                  : sourceKind === 'relative-source-root'
                    ? './'
                    : undefined,
            },
          }
        },
      },
    ], 'external', 'entry #100%.js')
    expectOriginal(result, 'finalToken', original)
    expect(result.map.sourcesContent).toContain(other)
    const offset = result.code.indexOf('otherToken')
    const before = result.code.slice(0, offset).split('\n')
    const position = new SourceMap(result.map).findEntry(before.length - 1, before.at(-1)!.length)
    assert('originalSource' in position)
    expect(position.originalSource).toMatch(/other\.js$/)
  })

  it('preserves native maps when hooks do not match', async () => {
    const result = await build([
      {
        name: 'unmatched',
        transformInclude: () => false,
        transform: () => null,
      },
    ], 'external')
    expectOriginal(result, 'originalToken', result.original)
  })

  it('accepts transforms without maps', async () => {
    const result = await build([
      {
        name: 'no-map',
        transform: code => ({ code, map: null }),
      },
    ], 'external')
    expectOriginal(result, 'originalToken', result.original)
  })

  it.each([false, undefined, 'none'] as const)('does not emit input maps when sourcemap is %s', async (sourcemap) => {
    const result = await build([
      transform('originalToken', 'mappedToken'),
    ], sourcemap)
    expect(result.map).toBeUndefined()
    expect(result.code).not.toContain('sourceMappingURL=')
  })

  it.each([false, undefined, 'none'] as const)('does not read plugin maps when sourcemap is %s', async (sourcemap) => {
    const result = await build([
      {
        name: 'unused-map',
        transform(code) {
          return {
            code,
            get map(): never {
              throw new Error('Map should only be read when requested')
            },
          }
        },
      },
    ], sourcemap)
    expect(result.code).toContain('originalToken')
  })

  it.skipIf(!supportsInputMaps)('forwards maps for a virtual module namespace', async () => {
    const original = '\n\nexport const originalToken = 42\n'
    const source = new MagicString(original)
    source.overwrite(original.indexOf('originalToken'), original.indexOf('originalToken') + 'originalToken'.length, 'virtualToken')
    source.prepend('\n')
    const result = await build([
      {
        name: 'virtual:plugin',
        resolveId: () => 'virtual-module',
        load: () => ({
          code: source.toString(),
          map: source.generateMap({ source: 'original.js', includeContent: true, hires: true }),
        }),
      },
    ], 'external')
    expectOriginal(result, 'virtualToken', original)
  })

  it.each(['text', 'json'] as const)('preserves %s loader content', async (loader) => {
    const original = loader === 'text'
      ? 'literal source text\n'
      : '{"originalToken":42}'
    const result = await build([
      {
        name: 'content-loader',
        bun: { loader },
        load(id) {
          return {
            code: original,
            map: new MagicString(original).generateMap({ source: id, includeContent: true, hires: true }),
          }
        },
      },
    ], 'external', `entry.${loader === 'json'
      ? 'json'
      : 'txt'}`, original)
    const url = `data:text/javascript;base64,${Buffer.from(result.code).toString('base64')}`
    const actual = await import(url)
    expect(actual.default).toEqual(loader === 'text'
      ? original
      : JSON.parse(original))
  })

  it.each(['text', 'json'] as const)('does not read unconsumed maps for %s loader', async (loader) => {
    const original = loader === 'text'
      ? 'literal source text\n'
      : '{"originalToken":42}'
    const result = await build([
      {
        name: 'unused-content-map',
        bun: { loader },
        load() {
          return {
            code: original,
            get map(): never {
              throw new Error('This loader does not consume source maps')
            },
          }
        },
      },
    ], 'external', `entry.${loader === 'json'
      ? 'json'
      : 'txt'}`, original)
    expect(result.code.length).toBeGreaterThan(0)
  })

  it('preserves CSS build syntax with a mapped transform', async () => {
    const original = '\n\nbody { color: red; }\n'
    const result = await build([
      {
        name: 'css-transform',
        transform(code) {
          const source = new MagicString(code).prepend('\n')
          return {
            code: source.toString(),
            get map(): never {
              throw new Error('CSS input maps are not consumed by Bun')
            },
          }
        },
      },
    ], 'external', 'entry.css', original)
    expect(result.code).toContain('color: red')
  })
})
