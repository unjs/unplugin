import { toRollupPlugin } from '../rollup'
import { UnpluginInstance, UnpluginFactory, VitePlugin } from '../types'

export function getVitePlugin <UserOptions = {}> (
  factory: UnpluginFactory<UserOptions>
): UnpluginInstance<UserOptions>['vite'] {
  return (userOptions?: UserOptions) => {
    const rawPlugin = factory(userOptions)

    const plugin = toRollupPlugin(rawPlugin) as VitePlugin

    if (rawPlugin.vite) {
      Object.assign(plugin, rawPlugin.vite)
    }

    return plugin
  }
}
