import { toArray } from '@antfu/utils'
import { UnpluginInstance, UnpluginFactory, UnpluginOptions, RollupPlugin, UnpluginContextMeta } from '../types'

export function getRollupPlugin <UserOptions = {}> (
  factory: UnpluginFactory<UserOptions>
): UnpluginInstance<UserOptions>['rollup'] {
  return (userOptions?: UserOptions) => {
    const meta: UnpluginContextMeta = {
      framework: 'rollup'
    }
    const rawPlugins = toArray(factory(userOptions!, meta))
    const plugins = rawPlugins.map(plugin => toRollupPlugin(plugin))
    return plugins.length > 0 ? plugins : plugins[0]
  }
}

export function toRollupPlugin (plugin: UnpluginOptions, containRollupOptions = true): RollupPlugin {
  if (plugin.transform && plugin.transformInclude) {
    const _transform = plugin.transform
    plugin.transform = function (code, id) {
      if (plugin.transformInclude && !plugin.transformInclude(id)) {
        return null
      }
      return _transform.call(this, code, id)
    }
  }

  if (plugin.load && plugin.loadInclude) {
    const _load = plugin.load
    plugin.load = function (id) {
      if (plugin.loadInclude && !plugin.loadInclude(id)) {
        return null
      }
      return _load.call(this, id)
    }
  }

  if (plugin.rollup && containRollupOptions) {
    Object.assign(plugin, plugin.rollup)
  }

  return plugin
}
