import fs from 'fs'
import { join, resolve } from 'path'
import type { Resolver } from 'enhanced-resolve'
import VirtualModulesPlugin from 'webpack-virtual-modules'
import { UnpluginContextMeta } from '../context'
import type { UnpluginInstance, UnpluginFactory, WebpackCompiler, ResolvedUnpluginOptions } from '../types'
import { UNPLUGIN_VMOD_PREFIX } from './meta'

export function getWebpackPlugin<UserOptions = {}> (
  factory: UnpluginFactory<UserOptions>
): UnpluginInstance<UserOptions>['webpack'] {
  return (userOptions?: UserOptions) => {
    return {
      apply (compiler: WebpackCompiler) {
        const meta: UnpluginContextMeta = {
          framework: 'webpack',
          webpack: {
            compiler
          }
        }

        const rawPlugin = factory(userOptions, meta)
        const plugin = Object.assign(rawPlugin, { __unpluginMeta: meta }) as ResolvedUnpluginOptions
        const loaderPath = resolve(__dirname, 'webpack/loaders')

        const injected = compiler.$unpluginContext || {}
        compiler.$unpluginContext = injected
        injected[plugin.name] = plugin

        compiler.hooks.thisCompilation.tap(plugin.name, (compilation) => {
          compilation.hooks.childCompiler.tap(plugin.name, (childCompiler) => {
            childCompiler.$unpluginContext = injected
          })
        })

        if (plugin.transform) {
          compiler.options.module.rules.push({
            include (id: string) {
              if (plugin.transformInclude) {
                return plugin.transformInclude(id)
              } else {
                return true
              }
            },
            enforce: plugin.enforce,
            use: [{
              loader: join(loaderPath, 'transform.cjs'),
              options: {
                unpluginName: plugin.name
              }
            }]
          })
        }

        if (plugin.resolveId) {
          const virtualModule = new VirtualModulesPlugin()
          plugin.__vfs = virtualModule
          compiler.options.plugins.push(virtualModule)

          const resolver = {
            apply (resolver: Resolver) {
              const tap = (target: any) => async (request: any, resolveContext: any, callback: any) => {
                if (!request.request || request.request.startsWith(UNPLUGIN_VMOD_PREFIX)) {
                  return callback()
                }
                let resolved = await plugin.resolveId!(request.request)
                if (resolved != null) {
                  if (resolved === request.request) {
                    resolved = UNPLUGIN_VMOD_PREFIX + request.request
                  }
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

              // resolver
              //   .getHook('described-resolve')
              //   .tapAsync('unplugin', tap(resolver.ensureHook('internal-resolve')))
              resolver
                .getHook('resolve')
                .tapAsync('unplugin', tap(resolver.ensureHook('resolve')))
              // resolver
              //   .getHook('file')
              //   .tapAsync('unplugin', tap(resolver.ensureHook('internal-resolve')))
            }
          }

          compiler.options.resolve.plugins = compiler.options.resolve.plugins || []
          compiler.options.resolve.plugins.push(resolver)
        }

        // TODO: not working for virtual module
        if (plugin.load) {
          compiler.options.module.rules.push({
            include () {
              return true
            },
            enforce: plugin.enforce,
            use: [{
              loader: join(loaderPath, 'load.cjs'),
              options: {
                unpluginName: plugin.name
              }
            }]
          })
        }

        if (plugin.webpack) {
          plugin.webpack(compiler)
        }
      }
    }
  }
}
