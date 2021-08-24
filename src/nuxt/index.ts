import { getVitePlugin } from '../vite'
import { getWebpackPlugin } from '../webpack'
import { UnpluginInstance, UnpluginFactory } from '../types'

export function getNuxtModule <UserOptions = {}> (
  factory: UnpluginFactory<UserOptions>
): UnpluginInstance<UserOptions>['nuxt'] {
  return function (this: any, userOptions?: UserOptions) {
    // install webpack plugin
    this.extendBuild((config: any) => {
      config.plugins = config.plugins || []
      config.plugins.unshift(getWebpackPlugin(factory)(userOptions))
    })

    // install vite plugin
    this.nuxt.hook('vite:extend', (vite: any) => {
      vite.config.plugins = vite.config.plugins || []
      vite.config.plugins.push(getVitePlugin(factory)(userOptions))
    })
  }
}
