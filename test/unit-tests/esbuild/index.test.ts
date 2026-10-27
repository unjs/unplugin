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
        filter: { id: /terminal-highlight|\.[cm]?js$/ },
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
            filter: { id: /terminal-highlight|\.[cm]?js$/ },
            async handler(code) {
              return { code }
            },
          },
        },
        {
          name: 'passthru-2',
          transform: {
            filter: { id: /terminal-highlight|\.[cm]?js$/ },
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

describe('esbuild hook results and filters', () => {
  const dir = resolve(__dirname, 'fixtures/empty-result')

  function buildWith(plugin: Plugin, entry = 'entry.js') {
    return build({
      entryPoints: [
        resolve(dir, entry),
      ],
      bundle: true,
      write: false,
      format: 'esm',
      plugins: [plugin],
    })
  }

  it('keeps an empty-string transform result', async () => {
    const plugin = createUnplugin(() => ({
      name: 'empty-transform',
      transform: {
        filter: { id: /dep\.js$/ },
        handler() {
          return ''
        },
      },
    }))

    const result = await buildWith(plugin.esbuild())
    expect(result.outputFiles[0].text).not.toContain('ORIGINAL_DEP')
  })

  it('keeps an empty-string load result for a virtual module', async () => {
    const plugin = createUnplugin(() => ({
      name: 'empty-virtual',
      resolveId(id) {
        if (id === 'virtual:empty')
          return id
      },
      load(id) {
        if (id === 'virtual:empty')
          return ''
      },
    }))

    const result = await buildWith(plugin.esbuild(), 'virtual-entry.js')
    expect(result.outputFiles[0].text).toContain('ORIGINAL_DEP')
  })

  it('does not read a module whose id the transform filter rejects', async () => {
    const readFileSpy = vi.spyOn(fs.promises, 'readFile')
    try {
      const plugin = createUnplugin(() => ({
        name: 'never-matches',
        transform: {
          filter: { id: /\.never$/ },
          handler: vi.fn(),
        },
      }))

      await buildWith(plugin.esbuild())

      const reads = readFileSpy.mock.calls.filter(([path]) => String(path).startsWith(dir))
      expect(reads).toHaveLength(0)
    }
    finally {
      readFileSpy.mockRestore()
    }
  })

  it('scopes watch files to the hook call that added them', async () => {
    const watchFiles: string[][] = []
    const plugin = createUnplugin(() => ({
      name: 'watch-files',
      transform: {
        filter: { id: /\.js$/ },
        handler(code, id) {
          this.addWatchFile(`${id}.dep`)
          watchFiles.push(this.getWatchFiles())
          return code
        },
      },
    }))

    await buildWith(plugin.esbuild())

    expect(watchFiles.length).toBeGreaterThan(1)
    for (const files of watchFiles)
      expect(files).toHaveLength(1)
  })
})
