import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createUnplugin } from 'unplugin'
import { afterAll, describe, expect, it } from 'vitest'
import { runRspack, runWebpack } from '../utils'

// The project is reached through a link, the way every project under macOS's `/var` is
// (`/var` -> `/private/var`), or a linked project folder anywhere. A junction on Windows
// needs no privilege; other platforms ignore the type.
const root = realpathSync(mkdtempSync(join(tmpdir(), 'unplugin-symlinked-context-')))
const real = join(root, 'real')
const link = join(root, 'link')

mkdirSync(real, { recursive: true })
symlinkSync(real, link, 'junction')
writeFileSync(join(real, 'entry.js'), [
  `import a from 'virtual-a'`,
  `console.log(a)`,
].join('\n'))

afterAll(() => rmSync(root, { recursive: true, force: true }))

function createPlugin() {
  const seen = { resolveId: [] as [string, string | undefined][], load: [] as string[] }
  const plugin = createUnplugin(() => ({
    name: 'symlinked-context',
    resolveId(id, importer) {
      seen.resolveId.push([id, importer])
      if (id === 'virtual-a' || id === 'virtual-b')
        return `\0${id}`
    },
    load(id) {
      seen.load.push(id)
      if (id === '\0virtual-a')
        return `import b from 'virtual-b'\nexport default 'virtual-a:' + b`
      if (id === '\0virtual-b')
        return `export default 'from-virtual-b'`
    },
  }))
  return { seen, plugin }
}

const frameworks = [
  [
    'webpack',
    (plugin: ReturnType<typeof createPlugin>['plugin'], output: string) => runWebpack({
      mode: 'development',
      devtool: false,
      context: link,
      entry: join(link, 'entry.js'),
      output: { path: output, filename: 'main.js' },
      plugins: [
        plugin.webpack(),
      ],
    }),
  ],
  [
    'rspack',
    (plugin: ReturnType<typeof createPlugin>['plugin'], output: string) => runRspack({
      mode: 'development',
      devtool: false,
      context: link,
      entry: join(link, 'entry.js'),
      output: { path: output, filename: 'main.js' },
      plugins: [
        plugin.rspack(),
      ],
    }),
  ],
] as const

describe('a build context reached through a symlink', () => {
  for (const [name, run] of frameworks) {
    it(name, async () => {
      const { seen, plugin } = createPlugin()
      const output = join(root, `dist-${name}`)
      await run(plugin, output)

      // Both virtual modules reach load with their own id, not the made up path
      expect(seen.load).toContain('\0virtual-a')
      expect(seen.load).toContain('\0virtual-b')
      // A virtual importer is decoded before it reaches resolveId, never the made up path.
      // rspack keeps a leading separator on it with or without a link, a separate matter.
      expect(seen.resolveId).toContainEqual([
        'virtual-b',
        expect.stringMatching(/^[\\/]?\0virtual-a$/),
      ])
      // and what load returned is what got bundled
      expect(readFileSync(join(output, 'main.js'), 'utf8')).toContain('from-virtual-b')
    })
  }
})
