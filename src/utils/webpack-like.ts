import type { RuleSetUseItem } from '@rspack/core'
import type { ResolvedUnpluginOptions, UnpluginOptions } from '../types'
import type { PluginFilter } from './filter'
import { realpathSync } from 'node:fs'
import { isAbsolute, normalize } from 'node:path'
import { normalizeObjectHook } from './filter'

type IdFilteredHook = NonNullable<UnpluginOptions['load'] | UnpluginOptions['transform']>

export function createCachedIdFilter(getHook: () => IdFilteredHook): PluginFilter {
  let cached: { hook: IdFilteredHook, cwd: string, filter: PluginFilter } | undefined
  return (id) => {
    const hook = getHook()
    const cwd = process.cwd()
    // The id part of a transform filter is exactly what a load filter checks
    if (cached?.hook !== hook || cached.cwd !== cwd)
      cached = { hook, cwd, filter: normalizeObjectHook('transform', hook).idFilter }
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
 * Returns the build context with its symlinks resolved, to build the virtual module prefix on.
 *
 * Webpack and Rspack resolve symlinks in module paths (`resolve.symlinks` is on by default), so
 * a virtual module path made from a context that goes through a link, such as any project under
 * macOS's `/var` or a linked project folder, resolves to a path where the virtual module was
 * never written, and the build fails with ENOENT.
 *
 * With no link left in the prefix, neither resolver rewrites a virtual path built on it.
 * `realpathSync` and not `realpathSync.native`: it resolves links and junctions only, and leaves
 * Windows short names and letter case as the context gave them. A context that does not exist
 * is returned as is.
 *
 * @param context - The `context` option of the compiler, or the current directory.
 * @returns the real path of the context.
 */
export function realContext(context: string): string {
  try {
    return realpathSync(context)
  }
  catch {
    return context
  }
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
