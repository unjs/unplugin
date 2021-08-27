import fs from 'fs'
import { join, resolve } from 'upath'
import type { Resolver } from 'enhanced-resolve'
import VirtualModulesPlugin from 'webpack-virtual-modules'
import type { UnpluginContextMeta, UnpluginInstance, UnpluginFactory, WebpackCompiler, ResolvedUnpluginOptions } from '../types'

const TRANSFORM_LOADER = resolve(__dirname, 'webpack/loaders/transform.cjs')
const LOAD_LOADER = resolve(__dirname, 'webpack/loaders/load.cjs')

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
        const plugin = Object.assign(
          rawPlugin,
          {
            __unpluginMeta: meta,
            __virtualModulePrefix: join(process.cwd(), 'virtual:')
          }
        ) as ResolvedUnpluginOptions

        // inject context object to share with loaders
        const injected = compiler.$unpluginContext || {}
        compiler.$unpluginContext = injected
        injected[plugin.name] = plugin

        compiler.hooks.thisCompilation.tap(plugin.name, (compilation) => {
          compilation.hooks.childCompiler.tap(plugin.name, (childCompiler) => {
            childCompiler.$unpluginContext = injected
          })
        })

        // transform hook
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
              loader: TRANSFORM_LOADER,
              options: {
                unpluginName: plugin.name
              }
            }]
          })
        }

        // resolveId hook
        if (plugin.resolveId) {
          let vfs = compiler.options.plugins.find(i => i instanceof VirtualModulesPlugin) as VirtualModulesPlugin
          if (!vfs) {
            vfs = new VirtualModulesPlugin()
            compiler.options.plugins.push(vfs)
          }
          plugin.__vfsModules = new Set()
          plugin.__vfs = vfs

          const resolver = {
            apply (resolver: Resolver) {
              const target = resolver.ensureHook('resolve')
              const tap = () => async (request: any, resolveContext: any, callback: any) => {
                // filter out invalid requests
                if (!request.request || request.request.startsWith(plugin.__virtualModulePrefix)) {
                  return callback()
                }

                // call hook
                let resolved = await plugin.resolveId!(request.request)
                if (resolved == null) {
                  return callback()
                }

                // if the resolved module is not exists,
                // we treat it as a virtual module
                if (!fs.existsSync(resolved)) {
                  resolved = plugin.__virtualModulePrefix + request.request
                  plugin.__vfs!.writeModule(resolved, '')
                  plugin.__vfsModules!.add(resolved)
                }

                // construt the new request
                const newRequest = {
                  ...request,
                  request: resolved
                }

                // redirect the resolver
                resolver.doResolve(target, newRequest, null, resolveContext, callback)
              }

              resolver
                .getHook('resolve')
                .tapAsync('unplugin', tap())
            }
          }

          compiler.options.resolve.plugins = compiler.options.resolve.plugins || []
          compiler.options.resolve.plugins.push(resolver)
        }

        // load hook
        if (plugin.load && plugin.__vfsModules) {
          compiler.options.module.rules.push({
            include (id) {
              return plugin.__vfsModules!.has(id)
            },
            enforce: plugin.enforce,
            use: [{
              loader: LOAD_LOADER,
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
