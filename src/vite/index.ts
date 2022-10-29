import { toRollupPlugin } from '../rollup'
import type { UnpluginContextMeta, UnpluginFactory, UnpluginInstance, VitePlugin } from '../types'
import { toArray } from '../utils'

export function getVitePlugin <UserOptions = {}>(
  factory: UnpluginFactory<UserOptions>,
): UnpluginInstance<UserOptions>['vite'] {
  return (userOptions?: UserOptions) => {
    const meta: UnpluginContextMeta = {
      framework: 'vite',
    }
    const rawPlugins = toArray(factory(userOptions!, meta))

    const plugins = rawPlugins.map((rawPlugin) => {
      const plugin = toRollupPlugin(rawPlugin, false) as VitePlugin
      if (rawPlugin.vite)
        Object.assign(plugin, rawPlugin.vite)

      return plugin
    })

    return plugins.length === 1 ? plugins[0] : plugins
  }
}
