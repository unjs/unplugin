import { Buffer } from 'node:buffer'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { createUnplugin } from 'unplugin'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runRspack, runWebpack } from '../utils'

// A PNG header followed by bytes that are not valid UTF-8, so a text round-trip changes them.
const png = Buffer.from([
  0x89,
  0x50,
  0x4E,
  0x47,
  0x0D,
  0x0A,
  0x1A,
  0x0A,
  0xFF,
  0xFE,
  0x00,
])

// Unfiltered hooks, so the loaders run on the image too and must pass it on byte for byte.
const plugin = createUnplugin(() => ({
  name: 'binary-passthrough',
  load() {
    return null
  },
  transform() {
    return null
  },
}))

describe('binary assets survive unfiltered load and transform hooks', () => {
  let dir: string

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unplugin-binary-'))
    fs.writeFileSync(path.join(dir, 'img.png'), png)
    fs.writeFileSync(path.join(dir, 'entry.js'), 'import url from \'./img.png\'\nconsole.log(url)\n')
  })

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  function options() {
    return {
      mode: 'development' as const,
      context: dir,
      entry: path.join(dir, 'entry.js'),
      output: {
        path: path.join(dir, 'dist'),
        filename: 'main.js',
        assetModuleFilename: 'img.png',
      },
      module: {
        rules: [
          { test: /\.png$/, type: 'asset/resource' },
        ],
      },
    }
  }

  it('webpack', async () => {
    await runWebpack({
      ...options(),
      plugins: [
        plugin.webpack(),
      ],
    })
    expect(fs.readFileSync(path.join(dir, 'dist/img.png')).equals(png)).toBe(true)
  })

  it('rspack', async () => {
    await runRspack({
      ...options(),
      plugins: [
        plugin.rspack(),
      ],
    })
    expect(fs.readFileSync(path.join(dir, 'dist/img.png')).equals(png)).toBe(true)
  })
})
