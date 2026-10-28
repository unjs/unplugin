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

// Build twice with the same compiler so the second build can reuse the in-memory cache
async function buildTwice(compiler: Compiler): Promise<void> {
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
  await run()
  await run()
  await new Promise<void>(resolve => compiler.close(resolve))
}

const frameworks = [
  [
    'webpack',
    (plugin: UnpluginInstance<any>) => webpackBuild({
      mode: 'development',
      cache: { type: 'memory' },
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
    (plugin: UnpluginInstance<any>) => rspackBuild({
      mode: 'development',
      cache: true,
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

describe('this.cacheable', () => {
  for (const [name, createCompiler] of frameworks) {
    it(name, async () => {
      const { calls, plugin } = createPlugin()

      await buildTwice(createCompiler(plugin))

      // `entry.js` comes from the cache on the second build, while the modules marked
      // with `this.cacheable(false)` in `load` or `transform` are built again
      expect(calls).toEqual({
        'load loaded.js': 2,
        'transform entry.js': 1,
        'transform loaded.js': 2,
        'transform transformed.js': 2,
      })
    })
  }
})
