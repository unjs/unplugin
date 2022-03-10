import { resolve } from 'path'
import { sources } from 'webpack'
import type { Compilation } from 'webpack'
import type { UnpluginBuildContext } from 'src'

export default function genContext (compilation: Compilation):UnpluginBuildContext {
  return {
    addWatchFile (id) {
      (compilation.fileDependencies ?? compilation.compilationDependencies).add(
        resolve(process.cwd(), id)
      )
    },
    emitFile (emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name
      if (emittedFile.source && outFileName) {
        compilation.emitAsset(
          outFileName,
          // @ts-ignore
          sources
            ? new sources.RawSource(
              typeof emittedFile.source === 'string'
                ? emittedFile.source
                : Buffer.from(emittedFile.source)
            )
            : {
                source: () => emittedFile.source,
                size: () => emittedFile.source!.length
              }
        )
      }
    },
    getWatchFiles () {
      return Array.from(
        compilation.fileDependencies ?? compilation.compilationDependencies
      )
    }
  }
}
