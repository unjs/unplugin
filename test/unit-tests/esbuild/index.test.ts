import { resolve } from 'node:path'
import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'
import { createUnplugin } from '../../../src/index'

const fixtureDir = resolve(__dirname, 'fixtures/browser-false-stub')

describe('esbuild getContents with browser:false stubbed module', () => {
  it('does not throw ENOENT when transform.getContents() is called for a file switched off via package.json/browser', async () => {
    const plugin = createUnplugin(() => ({
      name: 'passthru',
      transform: {
        filter: { id: /\.[cm]?js$/ },
        async handler(code) {
          return { code }
        },
      },
    }))

    await expect(build({
      absWorkingDir: fixtureDir,
      entryPoints: ['./entry.js'],
      bundle: true,
      platform: 'browser',
      write: false,
      plugins: [plugin.esbuild()],
    })).resolves.toBeDefined()
  })
})
