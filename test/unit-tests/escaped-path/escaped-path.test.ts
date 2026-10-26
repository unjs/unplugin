import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createUnplugin } from 'unplugin'
import { afterAll, describe, expect, it } from 'vitest'
import { unescapeResourcePath } from '../../../src/utils/webpack-like'
import { build } from '../utils'

const root = realpathSync(mkdtempSync(join(tmpdir(), 'unplugin-escaped-path-')))
const hashFile = join(root, 'msg#hash.js')
const virtualId = '\0virtual-msg'

mkdirSync(root, { recursive: true })
writeFileSync(join(root, 'entry.js'), [
  `import hash from './msg#hash.js'`,
  `import virtual from 'virtual-msg'`,
  `console.log(hash, virtual)`,
].join('\n'))
writeFileSync(hashFile, `export default 'hash'`)

afterAll(() => rmSync(root, { recursive: true, force: true }))

function createPlugin() {
  const seen: Record<'resolveId' | 'load' | 'transform', string[]> = { resolveId: [], load: [], transform: [] }
  const plugin = createUnplugin(() => ({
    name: 'escaped-path',
    resolveId(id) {
      seen.resolveId.push(id)
      if (id === 'virtual-msg')
        return virtualId
    },
    load(id) {
      seen.load.push(id)
      if (id === virtualId)
        return `export default 'virtual'`
    },
    transform(code, id) {
      seen.transform.push(id)
      return code
    },
  }))
  return { seen, plugin }
}

const frameworks = [
  [
    'webpack',
    (plugin: any) => build.webpack({
      mode: 'development',
      context: root,
      entry: join(root, 'entry.js'),
      output: {
        path: join(root, 'dist-webpack'),
      },
      plugins: [
        plugin.webpack(),
      ],
    }),
  ],
  [
    'rspack',
    (plugin: any) => build.rspack({
      mode: 'development',
      context: root,
      entry: join(root, 'entry.js'),
      output: {
        path: join(root, 'dist-rspack'),
      },
      plugins: [
        plugin.rspack(),
      ],
    }),
  ],
] as const

describe('escaped paths', () => {
  for (const [name, run] of frameworks) {
    it(name, async () => {
      const { seen, plugin } = createPlugin()
      await new Promise<void>((done, reject) => {
        const compiler: any = run(plugin)
        compiler.run((error: Error | null, stats: any) => {
          compiler.close(() => {
            if (error || stats?.hasErrors())
              reject(error ?? new Error(stats.toString({ errors: true })))
            else
              done()
          })
        })
      })

      // A `#` in a real file name must reach the hooks as is, without the loader escape
      for (const hook of ['load', 'transform'] as const) {
        expect(seen[hook]).toContain(hashFile)
      }
      // and a virtual id with a leading `\0` must stay untouched
      expect(seen.load).toContain(virtualId)
    })
  }
})

describe('unescapeResourcePath', () => {
  it('removes the escape character of each bundler', () => {
    expect(unescapeResourcePath('/a/msg\0#hash.js', 'webpack')).toBe('/a/msg#hash.js')
    expect(unescapeResourcePath('/a/msg\0?x\0\0y.js', 'webpack')).toBe('/a/msg?x\0y.js')
    expect(unescapeResourcePath('/a/msg\u200B#hash.js', 'rspack')).toBe('/a/msg#hash.js')
    expect(unescapeResourcePath('/a/msg\u200B?x\u200B\u200By.js', 'rspack')).toBe('/a/msg?x\u200By.js')
  })

  it('leaves the escape character of the other bundler alone', () => {
    expect(unescapeResourcePath('/a/msg\u200B#hash.js', 'webpack')).toBe('/a/msg\u200B#hash.js')
    expect(unescapeResourcePath('/a/msg\0#hash.js', 'rspack')).toBe('/a/msg\0#hash.js')
  })
})
