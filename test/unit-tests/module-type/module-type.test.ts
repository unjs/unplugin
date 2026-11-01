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
    // Its name starts like webpack's virtual module prefix (`<context>/_virtual_`), but it is a real file.
    fs.writeFileSync(path.join(dir, '_virtual_helper.json'), '{ "name": "helper" }\n')
    fs.writeFileSync(path.join(dir, 'entry.js'), 'import data from \'./data.json\'\nimport helper from \'./_virtual_helper.json\'\nimport config from \'virtual/config.json\'\nconsole.log(data.name, helper.name, config.name)\n')
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
    expect(fs.readFileSync(path.join(dir, 'dist/main.js'), 'utf8')).toContain('helper')
  })

  it('rspack', async () => {
    await runRspack({
      ...options(),
      plugins: [
        plugin.rspack(),
      ],
    })
    expect(fs.readFileSync(path.join(dir, 'dist/main.js'), 'utf8')).toContain('helper')
  })
})

// Turns a real `.json` file into a JavaScript module. webpack and rspack only accept that with
// the `javascript/auto` type, so a hook limited to such files has to get it.
const toJs = () => 'export default { name: \'from-load\' }'
const narrowedHooks = {
  loadInclude: createUnplugin(() => ({
    name: 'load-include',
    loadInclude: id => id.endsWith('data.json'),
    load: toJs,
  })),
  filter: createUnplugin(() => ({
    name: 'load-filter',
    load: {
      filter: { id: /data\.json$/ },
      handler: toJs,
    },
  })),
}

describe.each(Object.entries(narrowedHooks))('load hook limited with %s turns a real .json file into JavaScript', (_name, narrowed) => {
  let dir: string

  beforeEach(() => {
    dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'unplugin-module-type-')))
    fs.writeFileSync(path.join(dir, 'data.json'), '{ "name": "original" }\n')
    fs.writeFileSync(path.join(dir, 'entry.js'), 'import data from \'./data.json\'\nconsole.log(data.name)\n')
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
        narrowed.webpack(),
      ],
    })
    expect(fs.readFileSync(path.join(dir, 'dist/main.js'), 'utf8')).toContain('from-load')
  })

  it('rspack', async () => {
    await runRspack({
      ...options(),
      plugins: [
        narrowed.rspack(),
      ],
    })
    expect(fs.readFileSync(path.join(dir, 'dist/main.js'), 'utf8')).toContain('from-load')
  })
})
