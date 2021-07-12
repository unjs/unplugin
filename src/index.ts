import { Plugin as RollupPlugin } from 'rollup'
import { WebpackPluginInstance } from 'webpack'

export interface UnpluginOptions<UserOptions> {
  setup(options: UserOptions): UserOptions
  hooks(options: UserOptions): RollupPlugin
}

export interface UnpluginInstance<UserOptions> {
  rollup: (options?: UserOptions) => RollupPlugin
  webpack: (options?: UserOptions) => WebpackPluginInstance
}

export function defineUnplugin<UserOptions = {}> (options: UnpluginOptions<UserOptions>): UnpluginInstance<UserOptions> {
  function getRollupPlugin (): UnpluginInstance<UserOptions>['rollup'] {
    throw new Error('Not implemented')
  }

  function getWebpackPlugin (): UnpluginInstance<UserOptions>['webpack'] {
    throw new Error('Not implemented')
  }

  return {
    get rollup () {
      return getRollupPlugin()
    },
    get webpack () {
      return getWebpackPlugin()
    }
  }
}
