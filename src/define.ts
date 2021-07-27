import { getRollupPlugin } from './rollup'
import { UnpluginInstance, UnpluginFactory } from './types'
import { getVitePlugin } from './vite'
import { getWebpackPlugin } from './webpack'

export function createUnplugin<UserOptions = {}> (
  factory: UnpluginFactory<UserOptions>
): UnpluginInstance<UserOptions> {
  return {
    get rollup () {
      return getRollupPlugin(factory)
    },
    get vite () {
      return getVitePlugin(factory)
    },
    get webpack () {
      return getWebpackPlugin(factory)
    },
    get raw () {
      return factory
    }
  }
}
