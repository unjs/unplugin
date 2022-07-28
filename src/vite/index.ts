import * as os from 'os'
import { normalizeAbsolutePath } from '../utils'
import { toRollupPlugin } from '../rollup'
import { UnpluginInstance, UnpluginFactory, UnpluginContextMeta } from '../types'

export function getVitePlugin <UserOptions = {}> (
  factory: UnpluginFactory<UserOptions>
): UnpluginInstance<UserOptions>['vite'] {
  return (userOptions?: UserOptions) => {
    const meta: UnpluginContextMeta = {
      framework: 'vite'
    }

    const rawPlugin = factory(userOptions, meta)

    // On windows, Vite replaces backward slashes in paths/ids with forward slashes
    // in the `load`, `transformInclude`, and `transform` hooks. The `resolveId` hook
    // however has backwards slashes.
    // To ensure consistent ids across all hooks, we replace the forward slashes
    // in the `load`, `transformInclude`, and `transform` hooks with backward slashes
    if (os.platform() === 'win32') {
      if (rawPlugin.load) {
        const _load = rawPlugin.load
        rawPlugin.load = function (id, ...args) {
          return _load.call(this, normalizeAbsolutePath(id), ...args)
        }
      }
      if (rawPlugin.transformInclude) {
        const _transformInclude = rawPlugin.transformInclude
        rawPlugin.transformInclude = function (id, ...args) {
          return _transformInclude.call(this, normalizeAbsolutePath(id), ...args)
        }
      }
      if (rawPlugin.transform) {
        const _transform = rawPlugin.transform
        rawPlugin.transform = function (code, id, ...args) {
          return _transform.call(this, code, normalizeAbsolutePath(id), ...args)
        }
      }
    }

    const plugin = toRollupPlugin(rawPlugin, false)

    if (rawPlugin.vite) {
      Object.assign(plugin, rawPlugin.vite)
    }

    return plugin
  }
}
