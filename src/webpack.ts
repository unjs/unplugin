import fs from 'fs'
import { UnpluginInstance, UnpluginOptions } from './types'
import { getLoaderPath } from './utils'

export function getWebpackPlugin<UserOptions = {}, ResolvedContext = UserOptions> (
  options: UnpluginOptions<UserOptions, ResolvedContext>
): UnpluginInstance<UserOptions>['webpack'] {
  return class WebpackPlugin {
    // eslint-disable-next-line no-useless-constructor
    constructor (public userOptions?: UserOptions) {}

    apply (compiler: any) {
      const context = options.setup(this.userOptions)
      const hooks = options.hooks(context)

      if (!compiler.$unplugin) {
        compiler.$unplugin = {}
      }
      compiler.$unplugin[options.name] = {
        context,
        hooks
      }

      if (hooks.transform) {
        const loaderPath = getLoaderPath(options.name)

        fs.writeFileSync(loaderPath, `module.exports = async function(source) {
          if (!this._compiler || !this._compiler.$unplugin) return source
          
          const plugin = this._compiler.$unplugin['${options.name}']

          if (!plugin) return source

          const res = await plugin.hooks.transform(source, this.resource)

          if (typeof res !== 'string') {
            this.callback(null, res.code, res.map)
          }
          else {
            this.callback(null, res)
          }
        }
        `, 'utf-8')

        compiler.options.module.rules.push({
          include (id: string) {
            return hooks.transformInclude?.(id)
          },
          enforce: options.enforce,
          use: [{
            ident: options.name,
            loader: loaderPath
          }]
        })
      }
    }
  }
}
