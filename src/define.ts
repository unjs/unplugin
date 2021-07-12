import { getRollupPlugin } from './rollup'
import { UnpluginOptions, UnpluginInstance } from './types'
import { getWebpackPlugin } from './webpack'

export function defineUnplugin<UserOptions = {}> (
  options: UnpluginOptions<UserOptions>
): UnpluginInstance<UserOptions> {
  return {
    get rollup () {
      return getRollupPlugin(options)
    },
    get webpack () {
      return getWebpackPlugin(options)
    }
  }
}
