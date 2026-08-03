import type { Plugin } from 'esbuild'
import fs from 'node:fs'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import { describe, expect, it, vi } from 'vitest'
import { createUnplugin } from '../../../src/index'

const fixtureDir = resolve(__dirname, 'fixtures/browser-false-stub')

function buildFixture(esbuildPlugin: Plugin) {
  return build({
    absWorkingDir: fixtureDir,
    entryPoints: ['./entry.js'],
    bundle: true,
    platform: 'browser',
    write: false,
    plugins: [esbuildPlugin],
  })
}

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

    await expect(buildFixture(plugin.esbuild())).resolves.toBeDefined()
  })

  it('caches the empty contents from an ENOENT stub so a second transform does not re-read the file', async () => {
    const readFileSpy = vi.spyOn(fs.promises, 'readFile')

    try {
      // Two transform hooks on the same plugin instance both call getContents()
      // for the same onLoad args, exercising the shared fsContentsCache.
      const plugin = createUnplugin(() => [
        {
          name: 'passthru-1',
          transform: {
            filter: { id: /\.[cm]?js$/ },
            async handler(code) {
              return { code }
            },
          },
        },
        {
          name: 'passthru-2',
          transform: {
            filter: { id: /\.[cm]?js$/ },
            async handler(code) {
              return { code }
            },
          },
        },
      ])

      await expect(buildFixture(plugin.esbuild())).resolves.toBeDefined()

      const stubReads = readFileSpy.mock.calls.filter(([path]) => String(path).includes('terminal-highlight'))
      expect(stubReads).toHaveLength(1)
    }
    finally {
      readFileSpy.mockRestore()
    }
  })
})
