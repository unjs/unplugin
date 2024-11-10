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

export function getSource(fileSource: string | Uint8Array) {
  // Create a require function to load webpack-sources as webpack in order to maintain compatibility.
  const webpackRequire = createRequire(require.resolve('webpack'))
  const RawSource = (webpackRequire('webpack-sources') as typeof import('webpack-sources')).RawSource

  return new RawSource(
    typeof fileSource === 'string'
      ? fileSource
      // Converting to string to support Webpack 4's RawSource.
      : Buffer.from(fileSource.buffer).toString('utf-8'),
  )
}

export function createBuildContext(options: ContextOptions, compiler: Compiler, compilation?: Compilation, loaderContext?: LoaderContext<{ unpluginName: string }>): UnpluginBuildContext {
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
          getSource(emittedFile.source) as import('webpack').sources.Source,
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
