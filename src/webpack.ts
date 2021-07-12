import fs from 'fs'
import { UnpluginInstance, UnpluginOptions } from './types'
import { getLoaderPath } from './utils'

export function getWebpackPlugin<UserOptions = {}> (
  options: UnpluginOptions<UserOptions>
): UnpluginInstance<UserOptions>['webpack'] {
  class UnpluginWebpackPlugin {
    // eslint-disable-next-line no-useless-constructor
    constructor (public userOptions?: UserOptions) {}
    apply (compiler: any) {
      const hooks = options.setup(this.userOptions)

      if (!compiler.$unplugin) {
        compiler.$unplugin = {}
      }
      compiler.$unplugin[options.name] = hooks

      if (hooks.transform) {
        const loaderPath = getLoaderPath(options.name)

        fs.writeFileSync(loaderPath, `
module.exports = async function(source, map) {
  const callback = this.async()
  const plugin = this._compiler.$unplugin['${options.name}']

  const res = await plugin.transform(source, this.resource)

  if (res == null) {
    callback(null, source, map)
  }
  else if (typeof res !== 'string') {
    callback(null, res.code, res.map)
  }
  else {
    callback(null, res, map)
  }
}
        `, 'utf-8')

        compiler.options.module.rules.push({
          include (id: string) {
            if (hooks.transformInclude) {
              return hooks.transformInclude(id)
            } else {
              return true
            }
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

  return UserOptions => new UnpluginWebpackPlugin(UserOptions)
}
