import { Buffer } from 'buffer'
import { extname } from 'path'
import { Parser } from 'acorn'
import type { CompilationContext } from '@farmfe/core'
import type { UnpluginBuildContext, UnpluginContext } from '..'

export function createFarmContext(
  context: CompilationContext,
  currentResolveId?: string,
): UnpluginBuildContext {
  return {
    parse(code: string, opts: any = {}) {
      return Parser.parse(code, {
        sourceType: 'module',
        ecmaVersion: 'latest',
        locations: true,
        ...opts,
      })
    },

    addWatchFile(id: string) {
      context.addWatchFile(currentResolveId || id, id)
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name
      if (emittedFile.source && outFileName) {
        context.emitFile({
          resolvedPath: outFileName,
          name: outFileName,
          content: [...Buffer.from(emittedFile.source)],
          resourceType: extname(outFileName),
        })
      }
    },
    getWatchFiles() {
      return context.getWatchFiles()
    },
  }
}

export function unpluginContext(context: CompilationContext): UnpluginContext {
  return {
    error: (error: any) =>
      context!.error(
        typeof error === 'string' ? new Error(error) : error,
      ),
    warn: (error: any) =>
      context!.warn(typeof error === 'string' ? new Error(error) : error),
  }
}
