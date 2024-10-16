import type { DecodedSourceMap, RawSourceMap } from '@ampproject/remapping'
import type { SourceMap } from 'rollup'
import type { ResolvedUnpluginOptions } from './types'
import { isAbsolute, normalize } from 'path'
import remapping from '@ampproject/remapping'

/**
 * Normalizes a given path when it's absolute. Normalizing means returning a new path by converting
 * the input path to the native os format. This is useful in cases where we want to normalize
 * the `id` argument of a hook. Any absolute ids should be in the default format
 * of the operating system. Any relative imports or node_module imports should remain
 * untouched.
 *
 * @param path - Path to normalize.
 * @returns a new normalized path.
 */
export function normalizeAbsolutePath(path: string) {
  if (isAbsolute(path))
    return normalize(path)
  else
    return path
}

/**
 * Null or whatever
 */
export type Nullable<T> = T | null | undefined

/**
 * Array, or not yet
 */
export type Arrayable<T> = T | Array<T>

export function toArray<T>(array?: Nullable<Arrayable<T>>): Array<T> {
  array = array || []
  if (Array.isArray(array))
    return array
  return [array]
}

export function shouldLoad(id: string, plugin: ResolvedUnpluginOptions, externalModules: Set<string>): boolean {
  if (id.startsWith(plugin.__virtualModulePrefix))
    id = decodeURIComponent(id.slice(plugin.__virtualModulePrefix.length))

  // load include filter
  if (plugin.loadInclude && !plugin.loadInclude(id))
    return false

  // Don't run load hook for external modules
  return !externalModules.has(id)
}

export function transformUse(
  data: { resource?: string, resourceQuery?: string },
  plugin: ResolvedUnpluginOptions,
  transformLoader: string,
) {
  if (data.resource == null)
    return []

  const id = normalizeAbsolutePath(data.resource + (data.resourceQuery || ''))
  if (!plugin.transformInclude || plugin.transformInclude(id)) {
    return [{
      loader: `${transformLoader}?unpluginName=${encodeURIComponent(plugin.name)}`,
    }]
  }
  return []
}

export function resolveQuery(query: string | { unpluginName: string }) {
  if (typeof query === 'string') {
    return new URLSearchParams(query).get('unpluginName')!
  }
  else {
    return query.unpluginName
  }
}

const postfixRE = /[?#].*$/
export function cleanUrl(url: string): string {
  return url.replace(postfixRE, '')
}

/*
  The following functions are copied from vite
  https://github.com/vitejs/vite/blob/0fe95d4a71930cf55acd628efef59e6eae0f77f7/packages/vite/src/node/utils.ts#L781-L868

  MIT License
  Copyright (c) 2019-present, VoidZero Inc. and Vite contributors
  https://github.com/vitejs/vite/blob/main/LICENSE
*/
const windowsDriveRE = /^[A-Z]:/
const replaceWindowsDriveRE = /^([A-Z]):\//
const linuxAbsolutePathRE = /^\/[^/]/
function escapeToLinuxLikePath(path: string) {
  if (windowsDriveRE.test(path)) {
    return path.replace(replaceWindowsDriveRE, '/windows/$1/')
  }
  if (linuxAbsolutePathRE.test(path)) {
    return `/linux${path}`
  }
  return path
}

const revertWindowsDriveRE = /^\/windows\/([A-Z])\//
function unescapeToLinuxLikePath(path: string) {
  if (path.startsWith('/linux/')) {
    return path.slice('/linux'.length)
  }
  if (path.startsWith('/windows/')) {
    return path.replace(revertWindowsDriveRE, '$1:/')
  }
  return path
}

const nullSourceMap: RawSourceMap = {
  names: [],
  sources: [],
  mappings: '',
  version: 3,
}
function combineSourcemaps(
  filename: string,
  sourcemapList: Array<DecodedSourceMap | RawSourceMap>,
): RawSourceMap {
  if (
    sourcemapList.length === 0
    || sourcemapList.every(m => m.sources.length === 0)
  ) {
    return { ...nullSourceMap }
  }

  // hack for parse broken with normalized absolute paths on windows (C:/path/to/something).
  // escape them to linux like paths
  // also avoid mutation here to prevent breaking plugin's using cache to generate sourcemaps like vue (see #7442)
  sourcemapList = sourcemapList.map((sourcemap) => {
    const newSourcemaps = { ...sourcemap }
    newSourcemaps.sources = sourcemap.sources.map(source =>
      source ? escapeToLinuxLikePath(source) : null,
    )
    if (sourcemap.sourceRoot) {
      newSourcemaps.sourceRoot = escapeToLinuxLikePath(sourcemap.sourceRoot)
    }
    return newSourcemaps
  })

  // We don't declare type here so we can convert/fake/map as RawSourceMap
  let map // : SourceMap
  let mapIndex = 1
  const useArrayInterface
    = sourcemapList.slice(0, -1).find(m => m.sources.length !== 1) === undefined
  if (useArrayInterface) {
    map = remapping(sourcemapList, () => null)
  }
  else {
    map = remapping(sourcemapList[0], (sourcefile) => {
      const mapForSources = sourcemapList
        .slice(mapIndex)
        .find(s => s.sources.includes(sourcefile))

      if (mapForSources) {
        mapIndex++
        return mapForSources
      }
      return null
    })
  }
  if (!map.file) {
    delete map.file
  }

  // unescape the previous hack
  map.sources = map.sources.map(source =>
    source ? unescapeToLinuxLikePath(source) : source,
  )
  map.file = filename

  return map as RawSourceMap
}

export function getCombinedSourcemap(sourcemapChain: Nullable<Arrayable<SourceMap | string>>, filename: string, originalCode: string): SourceMap | null {
  sourcemapChain = toArray(sourcemapChain)
  let combinedMap = null

  for (let m of sourcemapChain) {
    if (typeof m === 'string')
      m = JSON.parse(m)
    if (!('version' in (m as SourceMap))) {
      // { mappings: '' }
      if ((m as SourceMap).mappings === '') {
        combinedMap = { mappings: '' }
        break
      }
      // empty, nullified source map
      combinedMap = null
      break
    }
    if (!combinedMap) {
      const sm = m as SourceMap
      // sourcemap should not include `sources: [null]` (because `sources` should be string) nor
      // `sources: ['']` (because `''` means the path of sourcemap)
      // but MagicString generates this when `filename` option is not set.
      // Rollup supports these and therefore we support this as well
      if (sm.sources.length === 1 && !sm.sources[0]) {
        combinedMap = {
          ...sm,
          sources: [filename],
          sourcesContent: [originalCode],
        }
      }
      else {
        combinedMap = sm
      }
    }
    else {
      combinedMap = combineSourcemaps(cleanUrl(filename), [
        m as RawSourceMap,
        combinedMap as RawSourceMap,
      ]) as SourceMap
    }
  }
  return combinedMap as SourceMap
}
