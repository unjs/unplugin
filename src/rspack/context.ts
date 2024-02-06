import { Buffer } from 'buffer'
import sources from 'webpack-sources'
import type { Compilation, LoaderContext } from '@rspack/core'
import { Parser } from 'acorn'
import type { UnpluginBuildContext, UnpluginContext, UnpluginMessage } from '../types'

export function createBuildContext(compilation: Compilation): UnpluginBuildContext {
  return {
    parse(code: string, opts: any = {}) {
      return Parser.parse(code, {
        sourceType: 'module',
        ecmaVersion: 'latest',
        locations: true,
        ...opts,
      })
    },
    addWatchFile() {
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
      return []
    },
  }
}

export function createContext(loader: LoaderContext): UnpluginContext {
  function normalizeMessage(error: string | UnpluginMessage): Error {
    return typeof error === 'string'
      ? new Error(error)
      : error as Error
  }
  return {
    error: error => loader.emitError(normalizeMessage(error)),
    warn: message => loader.emitWarning(normalizeMessage(message)),
  }
}
