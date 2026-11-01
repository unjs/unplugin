import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { createUnplugin } from 'unplugin'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runRspack, runWebpack } from '../utils'

// An unfiltered `load` hook that only has something to say about its virtual module.
const plugin = createUnplugin(() => ({
  name: 'unfiltered-load',
  resolveId(id) {
    return id === 'virtual/config.json'
      ? id
      : null
  },
  load(id) {
    return id === 'virtual/config.json'
      ? 'export default { name: \'virtual\' }'
      : null
  },
}))

describe('unfiltered load hook leaves the module type of real files alone', () => {
  let dir: string

  beforeEach(() => {
    dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'unplugin-module-type-')))
    fs.writeFileSync(path.join(dir, 'data.json'), '{ "name": "unplugin" }\n')
    fs.writeFileSync(path.join(dir, 'entry.js'), 'import data from \'./data.json\'\nimport config from \'virtual/config.json\'\nconsole.log(data.name, config.name)\n')
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
    expect(fs.readFileSync(path.join(dir, 'dist/main.js'), 'utf8')).toContain('virtual')
  })

  it('rspack', async () => {
    await runRspack({
      ...options(),
      plugins: [
        plugin.rspack(),
      ],
    })
    expect(fs.readFileSync(path.join(dir, 'dist/main.js'), 'utf8')).toContain('virtual')
  })
})
