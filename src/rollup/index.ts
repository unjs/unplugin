import { Plugin as RollupPlugin } from 'rollup'
import { UnpluginInstance, UnpluginFactory, UnpluginOptions } from '../types'

export function getRollupPlugin <UserOptions = {}> (
  factory: UnpluginFactory<UserOptions>
): UnpluginInstance<UserOptions>['rollup'] {
  return (userOptions?: UserOptions) => {
    const rawPlugin = factory(userOptions)
    return toRollupPlugin(rawPlugin)
  }
}

export function toRollupPlugin (rawPlugin: UnpluginOptions) {
  const plugin: RollupPlugin = {
    ...rawPlugin
  }

  if (rawPlugin.transform && rawPlugin.transformInclude) {
    plugin.transform = (code, id) => {
      if (rawPlugin.transformInclude && !rawPlugin.transformInclude(id)) {
        return null
      }
      return rawPlugin.transform!(code, id)
    }
  }

  if (rawPlugin.rollup) {
    Object.assign(plugin, rawPlugin.rollup)
  }

  return plugin
}
