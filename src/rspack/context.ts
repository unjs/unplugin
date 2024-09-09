import { resolve } from 'path'
import { Buffer } from 'buffer'
import type { Compilation, Compiler, LoaderContext } from '@rspack/core'
import { Parser } from 'acorn'
import type { UnpluginBuildContext, UnpluginContext, UnpluginMessage } from '../types'

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
      compilation.fileDependencies.add(resolve(process.cwd(), file))
    },
    getWatchFiles() {
      return Array.from(compilation.fileDependencies)
    },
    parse(code: string, opts: any = {}) {
      return Parser.parse(code, {
        sourceType: 'module',
        ecmaVersion: 'latest',
        locations: true,
        ...opts,
      })
    },
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
