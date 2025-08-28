import type { Loader, PluginBuilder } from 'bun'
import type { UnpluginBuildContext, UnpluginContext, UnpluginMessage } from '../types'
import fs from 'node:fs'
import path from 'node:path'
import * as acorn from 'acorn'

const ExtToLoader: Record<string, Loader> = {
  '.js': 'js',
  '.mjs': 'js',
  '.cjs': 'js',
  '.jsx': 'jsx',
  '.ts': 'ts',
  '.cts': 'ts',
  '.mts': 'ts',
  '.tsx': 'tsx',
  '.css': 'css',
  '.less': 'css',
  '.stylus': 'css',
  '.scss': 'css',
  '.sass': 'css',
  '.json': 'json',
  '.txt': 'text',
}

export function guessLoader(id: string): Loader {
  return ExtToLoader[path.extname(id).toLowerCase()] || 'js'
}

export function createBuildContext(build: PluginBuilder): UnpluginBuildContext {
  const watchFiles: string[] = []

  return {
    addWatchFile(file) {
      watchFiles.push(file)
    },
    getWatchFiles() {
      return watchFiles
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name
      const outdir = build?.config?.outdir
      if (outdir && emittedFile.source && outFileName) {
        const outPath = path.resolve(outdir, outFileName)
        const outDir = path.dirname(outPath)
        if (!fs.existsSync(outDir))
          fs.mkdirSync(outDir, { recursive: true })
        fs.writeFileSync(outPath, emittedFile.source)
      }
    },
    parse(code, opts = {}) {
      return acorn.parse(code, {
        sourceType: 'module',
        ecmaVersion: 'latest',
        locations: true,
        ...opts,
      })
    },
    getNativeBuildContext() {
      return { framework: 'bun', build }
    },
  }
}

export function createPluginContext(
  buildContext: UnpluginBuildContext,
): {
  errors: Array<string | UnpluginMessage>
  warnings: Array<string | UnpluginMessage>
  mixedContext: UnpluginBuildContext & UnpluginContext
} {
  const errors: Array<string | UnpluginMessage> = []
  const warnings: Array<string | UnpluginMessage> = []

  const mixedContext: UnpluginBuildContext & UnpluginContext = {
    ...buildContext,
    error(error) {
      errors.push(error)
    },
    warn(warning) {
      warnings.push(warning)
    },
  }

  return {
    errors,
    warnings,
    mixedContext,
  }
}
