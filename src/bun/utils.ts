import type { UnpluginBuildContext, UnpluginContext } from '../types'
import * as acorn from 'acorn'

export function createBuildContext(): UnpluginBuildContext {
  const watchFiles: string[] = []

  return {
    addWatchFile(file) {
      watchFiles.push(file)
    },
    getWatchFiles() {
      return watchFiles
    },
    emitFile() {
      console.warn('[unplugin] emitFile is not supported in Bun')
    },
    parse(code: string, opts: any = {}) {
      return acorn.parse(code, {
        sourceType: 'module',
        ecmaVersion: 'latest',
        locations: true,
        ...opts,
      })
    },
  }
}

export function createPluginContext(
  buildContext: UnpluginBuildContext,
): {
  errors: any[]
  warnings: any[]
  mixedContext: UnpluginBuildContext & UnpluginContext
} {
  const errors: any[] = []
  const warnings: any[] = []

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
