import type { RuleSetUseItem } from '@rspack/core'
import type { Hook, LoadHookFilter, ResolvedUnpluginOptions } from '../types'
import type { PluginFilter } from './filter'
import { isAbsolute, normalize } from 'node:path'
import { normalizeObjectHook } from './filter'

export function createCachedIdFilter<T extends (...args: any[]) => any>(getHook: () => Hook<T, LoadHookFilter>): PluginFilter {
  let cached: { hook: Hook<T, LoadHookFilter>, cwd: string, filter: PluginFilter } | undefined
  return (id) => {
    const hook = getHook()
    const cwd = process.cwd()
    if (cached?.hook !== hook || cached.cwd !== cwd)
      cached = { hook, cwd, filter: normalizeObjectHook('load', hook).filter }
    return cached.filter(id)
  }
}

export function transformUse(
  data: { resource?: string, resourceQuery?: string },
  plugin: ResolvedUnpluginOptions,
  transformLoader: string,
  filter: PluginFilter,
): RuleSetUseItem[] {
  if (data.resource == null)
    return []

  const id = normalizeAbsolutePath(data.resource + (data.resourceQuery || ''))
  if (plugin.transformInclude && !plugin.transformInclude(id))
    return []

  if (!filter(id))
    return []

  return [
    {
      loader: transformLoader,
      options: { plugin },
      ident: plugin.name,
    },
  ]
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

/**
 * Webpack escapes special characters in a resource path, such as the `#` of `msg#hash.js`, by
 * prefixing them with an escape character. Rspack does the same with a different one.
 * Hooks should see the real path, so the escape characters have to be removed again.
 *
 * Only use this on resource paths, not on virtual module ids: those can legitimately
 * start with `\0`, like `\0virtual:foo` in the Rollup convention.
 *
 * @param path - Resource path of the loader context.
 * @param framework - Bundler that produced the path.
 * @returns the path without escape characters.
 */
export function unescapeResourcePath(path: string, framework: 'webpack' | 'rspack'): string {
  return framework === 'webpack'
    ? path.replace(/\0([\s\S])/g, '$1')
    : path.replace(/\u200B([\s\S])/g, '$1')
}
