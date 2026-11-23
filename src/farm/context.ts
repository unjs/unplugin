import type { CompilationContext } from '@farmfe/core'
import type { UnpluginBuildContext, UnpluginContext } from '../types'
import { Buffer } from 'node:buffer'
import { extname } from 'node:path'
import { parse } from '../utils/parse'

export function createFarmContext(
  context: CompilationContext,
  currentResolveId?: string,
): UnpluginBuildContext {
  return {
    parse,

    addWatchFile(id: string) {
      context.addWatchFile(id, currentResolveId || id)
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name
      if (emittedFile.source && outFileName) {
        context.emitFile({
          resolvedPath: outFileName,
          name: outFileName,
          content: [
            ...Buffer.from(emittedFile.source as any),
          ],
          resourceType: extname(outFileName),
        })
      }
    },
    getWatchFiles() {
      return context.getWatchFiles()
    },
    getNativeBuildContext() {
      return { framework: 'farm', context }
    },
  }
}

function formatMessage(error: unknown): string {
  if (typeof error === 'string')
    return error
  if (error instanceof Error)
    return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string')
    return error.message
  return String(error)
}

export function unpluginContext(context: CompilationContext): UnpluginContext {
  return {
    error: (error: any) => context!.error(formatMessage(error)),
    warn: (error: any) => context!.warn(formatMessage(error)),
  }
}
