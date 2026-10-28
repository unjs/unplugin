import type { UnpluginInstance } from 'unplugin'
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { createUnplugin } from 'unplugin'
import { afterAll, describe, expect, it } from 'vitest'
import { rspackBuild, webpackBuild } from '../utils'

const root = realpathSync(mkdtempSync(join(tmpdir(), 'unplugin-cacheable-')))

writeFileSync(join(root, 'entry.js'), [
  `import loaded from './loaded.js'`,
  `import transformed from './transformed.js'`,
  `console.log(loaded, transformed)`,
].join('\n'))
writeFileSync(join(root, 'loaded.js'), `export default 'loaded'`)
writeFileSync(join(root, 'transformed.js'), `export default 'transformed'`)

afterAll(() => rmSync(root, { recursive: true, force: true }))

function createPlugin() {
  const calls: Record<string, number> = {}
  const count = (key: string) => {
    calls[key] = (calls[key] ?? 0) + 1
  }
  const plugin = createUnplugin(() => ({
    name: 'cacheable',
    load(id) {
      if (basename(id) === 'loaded.js') {
        count('load loaded.js')
        this.cacheable?.(false)
      }
    },
    transform(_code, id) {
      count(`transform ${basename(id)}`)
      if (basename(id) === 'transformed.js')
        this.cacheable?.(false)
    },
  }))
  return { calls, plugin }
}

interface Compiler {
  run: (callback: (error: Error | null, stats?: { hasErrors: () => boolean, toString: (options: any) => string }) => void) => void
  close: (callback: () => void) => void
}

// Build `times` times with the same compiler, then close it so a persistent cache is written to disk
async function build(compiler: Compiler, times = 1): Promise<void> {
  const run = () => new Promise<void>((resolve, reject) => {
    compiler.run((error, stats) => {
      if (error)
        reject(error)
      else if (!stats || stats.hasErrors())
        reject(new Error(stats?.toString({ all: false, errors: true }) ?? 'no stats'))
      else
        resolve()
    })
  })
  for (let i = 0; i < times; i++)
    await run()
  await new Promise<void>(resolve => compiler.close(resolve))
}

const frameworks = [
  [
    'webpack',
    (plugin: UnpluginInstance<any>, persistent = false) => webpackBuild({
      mode: 'development',
      cache: persistent
        ? {
            type: 'filesystem',
            cacheDirectory: join(root, 'cache-webpack'),
          }
        : { type: 'memory' },
      context: root,
      entry: join(root, 'entry.js'),
      output: {
        path: join(root, 'dist-webpack'),
      },
      plugins: [
        plugin.webpack(),
      ],
    }) as unknown as Compiler,
  ],
  [
    'rspack',
    (plugin: UnpluginInstance<any>, persistent = false) => rspackBuild({
      mode: 'development',
      cache: persistent
        ? {
            type: 'persistent',
            storage: {
              type: 'filesystem',
              directory: join(root, 'cache-rspack'),
            },
          }
        : true,
      context: root,
      entry: join(root, 'entry.js'),
      output: {
        path: join(root, 'dist-rspack'),
      },
      plugins: [
        plugin.rspack(),
      ],
    }) as unknown as Compiler,
  ],
] as const

// `entry.js` comes from the cache on the second build, while the modules marked
// with `this.cacheable(false)` in `load` or `transform` are built again
const expected = {
  'load loaded.js': 2,
  'transform entry.js': 1,
  'transform loaded.js': 2,
  'transform transformed.js': 2,
}

describe('this.cacheable', () => {
  for (const [name, createCompiler] of frameworks) {
    it(name, async () => {
      const { calls, plugin } = createPlugin()

      await build(createCompiler(plugin), 2)

      expect(calls).toEqual(expected)
    })

    // A new compiler only has the cache on disk, like a restarted dev server
    it(`${name} with a persistent cache`, async () => {
      const { calls, plugin } = createPlugin()

      await build(createCompiler(plugin, true))
      await build(createCompiler(plugin, true))

      expect(calls).toEqual(expected)
    })
  }
})
