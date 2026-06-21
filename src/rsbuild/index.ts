import type { RsbuildPlugin } from '@rsbuild/core'
import type {
  UnpluginContextMeta,
  UnpluginFactory,
  UnpluginInstance,
  UnpluginOptions,
} from '../types'
import { version as unpluginVersion } from '../../package.json'
import { getRspackPluginFromRaw } from '../rspack'
import { toArray } from '../utils/general'

export function getRsbuildPlugin<UserOptions = Record<string, never>, Nested extends boolean = boolean>(
  factory: UnpluginFactory<UserOptions, Nested>,
): UnpluginInstance<UserOptions, Nested>['rsbuild']
export function getRsbuildPlugin<UserOptions = Record<string, never>>(
  factory: UnpluginFactory<UserOptions>,
) {
  return (userOptions?: UserOptions) => {
    const meta: UnpluginContextMeta = {
      framework: 'rsbuild',
      versions: { unplugin: unpluginVersion },
    }
    const rawPlugins = toArray(factory(userOptions!, meta))
    const plugins = rawPlugins.map(rawPlugin => toRsbuildPlugin(rawPlugin, meta))

    return plugins.length === 1 ? plugins[0] : plugins
  }
}

function toRsbuildPlugin(
  rawPlugin: UnpluginOptions,
  meta: UnpluginContextMeta,
): RsbuildPlugin {
  const rsbuildOptions = rawPlugin.rsbuild

  return {
    ...rsbuildOptions,
    name: rsbuildOptions?.name ?? rawPlugin.name,
    enforce: rsbuildOptions?.enforce ?? rawPlugin.enforce,
    async setup(api) {
      meta.versions = {
        ...meta.versions,
        rsbuild: api.context.version,
        unplugin: meta.versions.unplugin ?? unpluginVersion,
      }

      api.modifyRspackConfig((config) => {
        config.plugins.push(getRspackPluginFromRaw([rawPlugin], meta, { applyRspackHook: false }))
      })

      await rsbuildOptions?.setup?.(api)
    },
  }
}
