import fs from 'fs'
import { join, resolve } from 'path'
import type { Resolver } from 'enhanced-resolve'
import VirtualModulesPlugin from 'webpack-virtual-modules'
import type { UnpluginInstance, UnpluginFactory, WebpackCompiler } from '../types'

export function getWebpackPlugin<UserOptions = {}> (
  factory: UnpluginFactory<UserOptions>
): UnpluginInstance<UserOptions>['webpack'] {
  return (userOptions?: UserOptions) => {
    return {
      apply (compiler: WebpackCompiler) {
        const rawPlugin = factory(userOptions)
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
          const virtualModule = new VirtualModulesPlugin()
          rawPlugin.__vfs = virtualModule
          compiler.options.plugins.push(virtualModule)

          const resolver = {
            apply (resolver: Resolver) {
              const tap = (target: any) => async (request: any, resolveContext: any, callback: any) => {
                const resolved = await rawPlugin.resolveId!(request.request)
                if (resolved != null) {
                  const newRequest = {
                    ...request,
                    request: resolved
                  }
                  if (!fs.existsSync(resolved)) {
                    virtualModule.writeModule(resolved, '')
                  }
                  resolver.doResolve(target, newRequest, null, resolveContext, callback)
                } else {
                  callback()
                }
              }

              resolver
                .getHook('described-resolve')
                .tapAsync('unplugin', tap(resolver.ensureHook('internal-resolve')))
              resolver
                .getHook('resolve')
                .tapAsync('unplugin', tap(resolver.ensureHook('resolve')))
              resolver
                .getHook('file')
                .tapAsync('unplugin', tap(resolver.ensureHook('internal-resolve')))
            }
          }

          compiler.options.resolve.plugins = compiler.options.resolve.plugins || []
          compiler.options.resolve.plugins.unshift(resolver)
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
  }
}
