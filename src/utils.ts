import type { ResolvedUnpluginOptions } from './types'
import { isAbsolute, normalize } from 'path'

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
      loader: transformLoader,
      options: { plugin },
      ident: plugin.name,
    }]
  }
  return []
}
