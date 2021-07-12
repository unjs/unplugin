import { resolve } from 'path'
import { Compiler } from 'webpack'
import { UnpluginInstance, UnpluginFactory } from '../types'

export function getWebpackPlugin<UserOptions = {}> (
  factory: UnpluginFactory<UserOptions>
): UnpluginInstance<UserOptions>['webpack'] {
  class UnpluginWebpackPlugin {
    // eslint-disable-next-line no-useless-constructor
    constructor (public userOptions?: UserOptions) {}
    apply (compiler: Compiler) {
      const rawPlugin = factory(this.userOptions)

      // @ts-expect-error
      if (!compiler.$unpluginContext) {
      // @ts-expect-error
        compiler.$unpluginContext = {}
      }
      // @ts-expect-error
      compiler.$unpluginContext[rawPlugin.name] = rawPlugin

      if (rawPlugin.transform) {
        compiler.options.module.rules.push({
          include (id: string) {
            if (rawPlugin.transformInclude) {
              return rawPlugin.transformInclude(id)
            } else {
              return true
            }
          },
          enforce: rawPlugin.enforce,
          use: [{
            loader: resolve(__dirname, '..', 'dist/webpack/loader.cjs'),
            options: {
              unpluginName: rawPlugin.name
            }
          }]
        })
      }
    }
  }

  return UserOptions => new UnpluginWebpackPlugin(UserOptions)
}
