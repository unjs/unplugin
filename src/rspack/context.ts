import { resolve } from 'path'
import { Buffer } from 'buffer'
import sources from 'webpack-sources'
import type { Compilation, LoaderContext } from '@rspack/core'
import { Parser } from 'acorn'
import type { UnpluginBuildContext, UnpluginContext, UnpluginMessage } from '../types'

interface ContextOptions {
  addWatchFile: (file: string) => void
  getWatchFiles: () => string[]
}

export function contextOptionsFromCompilation(compilation: Compilation): ContextOptions {
  return {
    addWatchFile(file) {
      compilation.fileDependencies.add(file)
    },
    getWatchFiles() {
      return Array.from(compilation.fileDependencies)
    },
  }
}

export function createBuildContext(options: ContextOptions, compilation: Compilation): UnpluginBuildContext {
  return {
    parse(code: string, opts: any = {}) {
      return Parser.parse(code, {
        sourceType: 'module',
        ecmaVersion: 'latest',
        locations: true,
        ...opts,
      })
    },
    addWatchFile(id) {
      options.addWatchFile(resolve(process.cwd(), id))
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name
      if (emittedFile.source && outFileName) {
        compilation.emitAsset(
          outFileName,
          new sources.RawSource(
            // @ts-expect-error types mismatch
            typeof emittedFile.source === 'string'
              ? emittedFile.source
              : Buffer.from(emittedFile.source),
          ),
        )
      }
    },
    getWatchFiles() {
      return options.getWatchFiles()
    },
  }
}

export function createContext(loader: LoaderContext): UnpluginContext {
  return {
    error: error => loader.emitError(normalizeMessage(error)),
    warn: message => loader.emitWarning(normalizeMessage(message)),
  }
}

export function normalizeMessage(error: string | UnpluginMessage): Error {
  const err = new Error(typeof error === 'string' ? error : error.message)
  if (typeof error === 'object') {
    err.stack = error.stack
    err.cause = error.meta
  }
  return err
}
