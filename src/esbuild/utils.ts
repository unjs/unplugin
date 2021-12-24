import remapping from '@ampproject/remapping'
import type {
  DecodedSourceMap,
  RawSourceMap
} from '@ampproject/remapping/dist/types/types'

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
