import { join, resolve } from 'path'
import type { Resolver } from 'enhanced-resolve'
import type { UnpluginInstance, UnpluginFactory, WebpackCompiler } from '../types'

export function getWebpackPlugin<UserOptions = {}> (
  factory: UnpluginFactory<UserOptions>
): UnpluginInstance<UserOptions>['webpack'] {
  class UnpluginWebpackPlugin {
    // eslint-disable-next-line no-useless-constructor
    constructor (public userOptions?: UserOptions) {}

    apply (compiler: WebpackCompiler) {
      const rawPlugin = factory(this.userOptions)
      const loaderPath = resolve(__dirname, 'webpack/loaders')

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
            loader: join(loaderPath, 'transform.cjs'),
            options: {
              unpluginName: rawPlugin.name
            }
          }]
        })
      }

      if (rawPlugin.resolveId) {
        const resolver = {
          apply (resolver: Resolver) {
            const target = resolver.ensureHook('resolve')
            resolver
              .getHook('resolve')
              .tapAsync('unplugin', async (request: any, resolveContext: any, callback: any) => {
                const resolved = await rawPlugin.resolveId!(request.request)
                if (resolved != null) {
                  const newRequest = {
                    ...request,
                    request: resolved
                  }
                  resolver.doResolve(target, newRequest, null, resolveContext, callback)
                } else {
                  callback()
                }
              })
          }
        }

        compiler.options.resolve.plugins = compiler.options.resolve.plugins || []
        compiler.options.resolve.plugins.push(resolver)
      }

      // TODO: not working for virtual module
      if (rawPlugin.load) {
        compiler.options.module.rules.push({
          include () {
            return true
          },
          enforce: rawPlugin.enforce,
          use: [{
            loader: join(loaderPath, 'load.cjs'),
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
