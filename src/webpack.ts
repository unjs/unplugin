import fs from 'fs'
import { UnpluginInstance, UnpluginFactory } from './types'
import { getLoaderPath } from './utils'

export function getWebpackPlugin<UserOptions = {}> (
  factory: UnpluginFactory<UserOptions>
): UnpluginInstance<UserOptions>['webpack'] {
  class UnpluginWebpackPlugin {
    // eslint-disable-next-line no-useless-constructor
    constructor (public userOptions?: UserOptions) {}
    apply (compiler: any) {
      const rawPlugin = factory(this.userOptions)

      if (!compiler.$unplugin) {
        compiler.$unplugin = {}
      }
      compiler.$unplugin[rawPlugin.name] = rawPlugin

      if (rawPlugin.transform) {
        const loaderPath = getLoaderPath(rawPlugin.name)

        generateLoader(loaderPath, rawPlugin.name)

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
            ident: rawPlugin.name,
            loader: loaderPath
          }]
        })
      }
    }
  }

  return UserOptions => new UnpluginWebpackPlugin(UserOptions)
}

function generateLoader (loaderPath: string, name: string) {
  fs.writeFileSync(loaderPath, `
module.exports = async function(source, map) {
  const callback = this.async()
  const plugin = this._compiler.$unplugin['${name}']

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
}`, 'utf-8')
}
