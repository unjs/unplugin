import { resolve } from 'path'
import { UnpluginInstance, UnpluginFactory, WebpackCompiler } from '../types'

export function getWebpackPlugin<UserOptions = {}> (
  factory: UnpluginFactory<UserOptions>
): UnpluginInstance<UserOptions>['webpack'] {
  class UnpluginWebpackPlugin {
    // eslint-disable-next-line no-useless-constructor
    constructor (public userOptions?: UserOptions) {}

    apply (compiler: WebpackCompiler) {
      const rawPlugin = factory(this.userOptions)

      if (!compiler.$unpluginContext) {
        compiler.$unpluginContext = {}
      }
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
            loader: resolve(__dirname, '..', 'dist/webpack/loaders/transform.cjs'),
            options: {
              unpluginName: rawPlugin.name
            }
          }]
        })
      }

      // TODO: not working for virtual module
      if (rawPlugin.load) {
        compiler.options.module.rules.push({
          include () {
            return true
          },
          enforce: rawPlugin.enforce,
          use: [{
            loader: resolve(__dirname, '..', 'dist/webpack/loaders/load.cjs'),
            options: {
              unpluginName: rawPlugin.name
            }
          }]
        })
      }

      if (rawPlugin.webpack) {
        rawPlugin.webpack(compiler)
      }
    }
  }

  return UserOptions => new UnpluginWebpackPlugin(UserOptions)
}
