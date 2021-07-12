import { getRollupPlugin } from './rollup'
import { UnpluginInstance, UnpluginFactory } from './types'
import { getWebpackPlugin } from './webpack'

export function defineUnplugin<UserOptions = {}> (
  factory: UnpluginFactory<UserOptions>
): UnpluginInstance<UserOptions> {
  return {
    get rollup () {
      return getRollupPlugin(factory)
    },
    get webpack () {
      return getWebpackPlugin(factory)
    }
  }
}
