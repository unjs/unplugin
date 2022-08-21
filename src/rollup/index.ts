import { UnpluginInstance, UnpluginFactory, UnpluginOptions, RollupPlugin, UnpluginContextMeta } from '../types'

export function getRollupPlugin <UserOptions = {}> (
  factory: UnpluginFactory<UserOptions>
): UnpluginInstance<UserOptions>['rollup'] {
  return (userOptions?: UserOptions) => {
    const meta: UnpluginContextMeta = {
      framework: 'rollup'
    }
    const rawPlugin = factory(userOptions!, meta)
    return toRollupPlugin(rawPlugin)
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
