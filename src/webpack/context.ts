import type { Compilation, Compiler, LoaderContext } from 'webpack'
import type { UnpluginBuildContext, UnpluginContext, UnpluginMessage } from '../types'
import { Buffer } from 'buffer'
import { createRequire } from 'module'
import { resolve } from 'path'
import process from 'process'
import { Parser } from 'acorn'

interface ContextOptions {
  addWatchFile: (file: string) => void
  getWatchFiles: () => string[]
}

export function contextOptionsFromCompilation(compilation: Compilation): ContextOptions {
  return {
    addWatchFile(file) {
      (compilation.fileDependencies ?? compilation.compilationDependencies).add(file)
    },
    getWatchFiles() {
      return Array.from(compilation.fileDependencies ?? compilation.compilationDependencies)
    },
  }
}

export function createBuildContext(options: ContextOptions, compiler: Compiler, compilation?: Compilation, loaderContext?: LoaderContext<{ unpluginName: string }>): UnpluginBuildContext {
  const require = createRequire(import.meta.url)
  const sources = require('webpack-sources') as typeof import('webpack-sources')

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
        if (!compilation)
          throw new Error('unplugin/webpack: emitFile outside supported hooks  (buildStart, buildEnd, load, transform, watchChange)')
        compilation.emitAsset(
          outFileName,
          sources
            ? new sources.RawSource(
              // @ts-expect-error types mismatch
              typeof emittedFile.source === 'string'
                ? emittedFile.source
                : Buffer.from(emittedFile.source),
            ) as any
            : {
                source: () => emittedFile.source,
                size: () => emittedFile.source!.length,
              },
        )
      }
    },
    getWatchFiles() {
      return options.getWatchFiles()
    },
    getNativeBuildContext() {
      return { framework: 'webpack', compiler, compilation, loaderContext }
    },
  }
}

export function createContext(loader: LoaderContext<{ unpluginName: string }>): UnpluginContext {
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
