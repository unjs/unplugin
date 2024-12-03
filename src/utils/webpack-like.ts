import type { RuleSetUseItem } from '@rspack/core'
import type { ResolvedUnpluginOptions } from '../types'
import { isAbsolute, normalize } from 'path'

export function transformUse(
  data: { resource?: string, resourceQuery?: string },
  plugin: ResolvedUnpluginOptions,
  transformLoader: string,
): RuleSetUseItem[] {
  if (data.resource == null)
    return []

  const id = normalizeAbsolutePath(data.resource + (data.resourceQuery || ''))
  if (!plugin.transformInclude || plugin.transformInclude(id)) {
    return [
      {
        loader: transformLoader,
        options: { plugin },
        ident: plugin.name,
      },
    ]
  }
  return []
}

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
export function normalizeAbsolutePath(path: string): string {
  if (isAbsolute(path))
    return normalize(path)
  else
    return path
}
