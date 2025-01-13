import type { DecodedSourceMap, EncodedSourceMap } from '@ampproject/remapping'
import type { Loader, Location, Message, PartialMessage, PluginBuild } from 'esbuild'
import type { SourceMap } from 'rollup'
import type { UnpluginBuildContext, UnpluginContext, UnpluginMessage } from '../types'
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import remapping from '@ampproject/remapping'
import { parse } from '../utils/context'

const ExtToLoader: Record<string, Loader> = {
  '.js': 'js',
  '.mjs': 'js',
  '.cjs': 'js',
  '.jsx': 'jsx',
  '.ts': 'ts',
  '.cts': 'ts',
  '.mts': 'ts',
  '.tsx': 'tsx',
  '.css': 'css',
  '.less': 'css',
  '.stylus': 'css',
  '.scss': 'css',
  '.sass': 'css',
  '.json': 'json',
  '.txt': 'text',
}

export function guessLoader(code: string, id: string): Loader {
  return ExtToLoader[path.extname(id).toLowerCase()] || 'js'
}

export function unwrapLoader(
  loader: Loader | ((code: string, id: string) => Loader),
  code: string,
  id: string,
): Loader {
  if (typeof loader === 'function')
    return loader(code, id)

  return loader
}

// `load` and `transform` may return a sourcemap without toString and toUrl,
// but esbuild needs them, we fix the two methods
export function fixSourceMap(map: EncodedSourceMap): SourceMap {
  if (!Object.prototype.hasOwnProperty.call(map, 'toString')) {
    Object.defineProperty(map, 'toString', {
      enumerable: false,
      value: function toString() {
        return JSON.stringify(this)
      },
    })
  }
  if (!Object.prototype.hasOwnProperty.call(map, 'toUrl')) {
    Object.defineProperty(map, 'toUrl', {
      enumerable: false,
      value: function toUrl() {
        return `data:application/json;charset=utf-8;base64,${Buffer.from(this.toString()).toString('base64')}`
      },
    })
  }
  return map as SourceMap
}

// taken from https://github.com/vitejs/vite/blob/71868579058512b51991718655e089a78b99d39c/packages/vite/src/node/utils.ts#L525
const nullSourceMap: EncodedSourceMap = {
  names: [],
  sources: [],
  mappings: '',
  version: 3,
}
export function combineSourcemaps(
  filename: string,
  sourcemapList: Array<DecodedSourceMap | EncodedSourceMap>,
): EncodedSourceMap {
  sourcemapList = sourcemapList.filter(m => m.sources)

  if (
    sourcemapList.length === 0
    || sourcemapList.every(m => m.sources.length === 0)
  ) {
    return { ...nullSourceMap }
  }

  // We don't declare type here so we can convert/fake/map as EncodedSourceMap
  let map // : SourceMap
  let mapIndex = 1
  const useArrayInterface
    = sourcemapList.slice(0, -1).find(m => m.sources.length !== 1) === undefined
  if (useArrayInterface) {
    map = remapping(sourcemapList, () => null, true)
  }
  else {
    map = remapping(
      sourcemapList[0],
      (sourcefile) => {
        if (sourcefile === filename && sourcemapList[mapIndex])
          return sourcemapList[mapIndex++]
        else
          return { ...nullSourceMap }
      },
      true,
    )
  }
  if (!map.file)
    delete map.file

  return map as EncodedSourceMap
}

export function createBuildContext(build: PluginBuild): UnpluginBuildContext {
  const watchFiles: string[] = []
  const { initialOptions } = build
  return {
    parse,
    addWatchFile() {
      throw new Error('unplugin/esbuild: addWatchFile outside supported hooks (resolveId, load, transform)')
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name
      if (initialOptions.outdir && emittedFile.source && outFileName) {
        const outPath = path.resolve(initialOptions.outdir, outFileName)
        // Ensure output directory exists for this.emitFile
        const outDir = path.dirname(outPath)
        if (!fs.existsSync(outDir))
          fs.mkdirSync(outDir, { recursive: true })
        fs.writeFileSync(outPath, emittedFile.source)
      }
    },
    getWatchFiles() {
      return watchFiles
    },
    getNativeBuildContext() {
      return { framework: 'esbuild', build }
    },
  }
}

export function createPluginContext(context: UnpluginBuildContext): {
  errors: PartialMessage[]
  warnings: PartialMessage[]
  mixedContext: UnpluginContext & UnpluginBuildContext
} {
  const errors: PartialMessage[] = []
  const warnings: PartialMessage[] = []
  const pluginContext: UnpluginContext = {
    error(message) { errors.push(normalizeMessage(message)) },
    warn(message) { warnings.push(normalizeMessage(message)) },
  }

  const mixedContext: UnpluginContext & UnpluginBuildContext = {
    ...context,
    ...pluginContext,
    addWatchFile(id: string) {
      context.getWatchFiles().push(id)
    },
  }

  return {
    errors,
    warnings,
    mixedContext,
  }
}

function normalizeMessage(message: string | UnpluginMessage): Message {
  if (typeof message === 'string')
    message = { message }

  return {
    id: message.id!,
    pluginName: message.plugin!,
    text: message.message!,

    location: message.loc
      ? {
          file: message.loc.file,
          line: message.loc.line,
          column: message.loc.column,
        } as Location
      : null,

    detail: message.meta,
    notes: [],
  }
}

export function processCodeWithSourceMap(map: SourceMap | null | undefined, code: string): string {
  if (map) {
    if (!map.sourcesContent || map.sourcesContent.length === 0)
      map.sourcesContent = [code]

    map = fixSourceMap(map as EncodedSourceMap)
    code += `\n//# sourceMappingURL=${map.toUrl()}`
  }
  return code
}
