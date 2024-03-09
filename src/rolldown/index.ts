import { toRollupPlugin } from '../rollup'
import type { RolldownPlugin, UnpluginContextMeta, UnpluginFactory, UnpluginInstance } from '../types'
import { toArray } from '../utils'

export function getRolldownPlugin<UserOptions = Record<string, never>, Nested extends boolean = boolean>(
  factory: UnpluginFactory<UserOptions, Nested>,
) {
  return ((userOptions?: UserOptions) => {
    const meta: UnpluginContextMeta = {
      framework: 'rolldown',
    }
    const rawPlugins = toArray(factory(userOptions!, meta))

    const plugins = rawPlugins.map((rawPlugin) => {
      const plugin = toRollupPlugin(rawPlugin, false) as RolldownPlugin
      if (rawPlugin.rolldown)
        Object.assign(plugin, rawPlugin.rolldown)

      return plugin
    })

    return plugins.length === 1 ? plugins[0] : plugins
  }) as UnpluginInstance<UserOptions, Nested>['rolldown']
}
