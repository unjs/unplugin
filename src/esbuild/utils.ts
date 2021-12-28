import { extname } from 'path'
import remapping from '@ampproject/remapping'
import type {
  DecodedSourceMap,
  RawSourceMap
} from '@ampproject/remapping/dist/types/types'
import type { Loader } from 'esbuild'
import type { SourceMap } from 'rollup'

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
  '.json': 'json',
  '.txt': 'text'
}

export function guessLoader (id: string): Loader {
  return ExtToLoader[extname(id).toLowerCase()] || 'js'
}

// `load` and `transform` may return a sourcemap without toString and toUrl,
// but esbuild needs them, we fix the two methods
export function fixSourceMap (map: RawSourceMap): SourceMap {
  Object.defineProperty(map, 'toString', {
    enumerable: false,
    value: function toString () {
      return JSON.stringify(this)
    }
  })
  Object.defineProperty(map, 'toUrl', {
    enumerable: false,
    value: function toUrl () {
      return 'data:application/json;charset=utf-8;base64,' + Buffer.from(this.toString()).toString('base64')
    }
  })
  return map as SourceMap
}

// taken from https://github.com/vitejs/vite/blob/71868579058512b51991718655e089a78b99d39c/packages/vite/src/node/utils.ts#L525
const nullSourceMap: RawSourceMap = {
  names: [],
  sources: [],
  mappings: '',
  version: 3
}
export function combineSourcemaps (
  filename: string,
  sourcemapList: Array<DecodedSourceMap | RawSourceMap>
): RawSourceMap {
  if (
    sourcemapList.length === 0 ||
    sourcemapList.every(m => m.sources.length === 0)
  ) {
    return { ...nullSourceMap }
  }

  // We don't declare type here so we can convert/fake/map as RawSourceMap
  let map // : SourceMap
  let mapIndex = 1
  const useArrayInterface =
    sourcemapList.slice(0, -1).find(m => m.sources.length !== 1) === undefined
  if (useArrayInterface) {
    map = remapping(sourcemapList, () => null, true)
  } else {
    map = remapping(
      sourcemapList[0],
      function loader (sourcefile) {
        if (sourcefile === filename && sourcemapList[mapIndex]) {
          return sourcemapList[mapIndex++]
        } else {
          return { ...nullSourceMap }
        }
      },
      true
    )
  }
  if (!map.file) {
    delete map.file
  }

  return map as RawSourceMap
}
