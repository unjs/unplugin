import { Plugin as RollupPlugin } from 'rollup'
import { UnpluginInstance, UnpluginFactory } from '../types'

export function getRollupPlugin <UserOptions = {}> (
  factory: UnpluginFactory<UserOptions>
): UnpluginInstance<UserOptions>['rollup'] {
  return (userOptions?: UserOptions) => {
    const rawPlugin = factory(userOptions)

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

    return plugin
  }
}
