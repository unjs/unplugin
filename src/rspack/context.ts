import type { Compilation, Compiler, LoaderContext } from '@rspack/core'
import type { UnpluginBuildContext, UnpluginContext, UnpluginMessage } from '../types'
import { Buffer } from 'node:buffer'
import { resolve } from 'node:path'
import { parse } from '../utils/context'

export function createBuildContext(compiler: Compiler, compilation: Compilation, loaderContext?: LoaderContext): UnpluginBuildContext {
  return {
    getNativeBuildContext() {
      return {
        framework: 'rspack',
        compiler,
        compilation,
        loaderContext,
      }
    },
    addWatchFile(file) {
      const cwd = process.cwd()
      compilation.fileDependencies.add(resolve(cwd, file))
    },
    getWatchFiles() {
      return Array.from(compilation.fileDependencies)
    },
    parse,
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name
      if (emittedFile.source && outFileName) {
        const { sources } = compilation.compiler.webpack
        compilation.emitAsset(
          outFileName,
          new sources.RawSource(
            typeof emittedFile.source === 'string'
              ? emittedFile.source
              : Buffer.from(emittedFile.source),
          ),
        )
      }
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
