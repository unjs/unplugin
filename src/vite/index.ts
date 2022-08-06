import { toRollupPlugin } from '../rollup'
import { UnpluginInstance, UnpluginFactory, VitePlugin, UnpluginContextMeta } from '../types'

export function getVitePlugin <UserOptions = {}> (
  factory: UnpluginFactory<UserOptions>
): UnpluginInstance<UserOptions>['vite'] {
  return (userOptions?: UserOptions) => {
    const meta: UnpluginContextMeta = {
      framework: 'vite'
    }
    const rawPlugin = factory(userOptions, meta)

    const plugin = toRollupPlugin(rawPlugin, false) as VitePlugin

    if (rawPlugin.vite) {
      Object.assign(plugin, rawPlugin.vite)
    }
    return plugin
  }
}
