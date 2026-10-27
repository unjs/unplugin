import type { Compiler } from 'webpack'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createUnplugin } from 'unplugin'
import { beforeAll, expect, it } from 'vitest'
import { runWebpack } from '../utils'

const outputPath = path.resolve(__dirname, 'test-out')

beforeAll(() => {
  fs.rmSync(outputPath, { recursive: true, force: true })
})

it('webpack allows emitting assets from buildEnd', async () => {
  let emitStarted = false
  const beforeEmitPlugin = {
    apply(compiler: Compiler) {
      compiler.hooks.emit.tap('before-unplugin-build-end', () => {
        emitStarted = true
      })
    },
  }
  const plugin = createUnplugin(() => ({
    name: 'build-end-emit-file',
    buildEnd() {
      expect(emitStarted).toBe(false)
      this.emitFile({
        type: 'asset',
        fileName: 'build-end.json',
        source: '{"emitted":true}',
      })
    },
  })).webpack

  await runWebpack({
    mode: 'none',
    entry: path.resolve(__dirname, '../write-bundle/test-src/entry.js'),
    output: {
      path: outputPath,
      filename: 'output.js',
    },
    plugins: [
      beforeEmitPlugin,
      plugin(),
    ],
  })

  expect(fs.readFileSync(path.join(outputPath, 'build-end.json'), 'utf8')).toBe('{"emitted":true}')
})
