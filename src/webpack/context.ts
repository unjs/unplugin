import { resolve } from 'path'
import { Buffer } from 'buffer'
import process from 'process'
import sources from 'webpack-sources'
import type { Compilation, LoaderContext } from 'webpack'
import { Parser } from 'acorn'
import type { UnpluginBuildContext, UnpluginContext, UnpluginMessage } from '../types'

interface ContextOptions {
  addWatchFile(file: string): void
  getWatchFiles(): string[]
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

export function createBuildContext(options: ContextOptions, compilation?: Compilation): UnpluginBuildContext {
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
  }
}

export function createContext(loader: LoaderContext<{ unpluginName: string }>): UnpluginContext {
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
