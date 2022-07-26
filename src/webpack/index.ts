import fs from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import VirtualModulesPlugin from 'webpack-virtual-modules'
import type { ResolvePluginInstance, RuleSetUseItem } from 'webpack'
import type { UnpluginContextMeta, UnpluginInstance, UnpluginFactory, WebpackCompiler, ResolvedUnpluginOptions } from '../types'
import { slash, backSlash } from './utils'
import { createContext } from './context'

const _dirname = typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url))
const TRANSFORM_LOADER = resolve(_dirname, 'webpack/loaders/transform.js')
const LOAD_LOADER = resolve(_dirname, 'webpack/loaders/load.js')

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

        const virtualModulePrefix = resolve(process.cwd(), '_virtual_')

        const rawPlugin = factory(userOptions, meta)
        const plugin = Object.assign(
          rawPlugin,
          {
            __unpluginMeta: meta,
            __virtualModulePrefix: virtualModulePrefix
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
          const useLoader: RuleSetUseItem[] = [{
            loader: TRANSFORM_LOADER,
            ident: plugin.name,
            options: {
              unpluginName: plugin.name
            }
          }]
          const useNone: RuleSetUseItem[] = []
          compiler.options.module.rules.push({
            enforce: plugin.enforce,
            use: (data: { resource: string | null, resourceQuery: string }) => {
              if (data.resource == null) {
                return useNone
              }
              const id = slash(data.resource + (data.resourceQuery || ''))
              if (!plugin.transformInclude || plugin.transformInclude(id)) {
                return useLoader
              }
              return useNone
            }
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

          const resolverPlugin: ResolvePluginInstance = {
            apply (resolver) {
              const target = resolver.ensureHook('resolve')

              resolver
                .getHook('resolve')
                .tapAsync(plugin.name, async (request, resolveContext, callback) => {
                  if (!request.request) {
                    return callback()
                  }

                  const id = backSlash(request.request)

                  // filter out invalid requests
                  if (id.startsWith(plugin.__virtualModulePrefix)) {
                    return callback()
                  }

                  const requestContext = (request as unknown as { context: { issuer: string } }).context
                  const importer = requestContext.issuer !== '' ? requestContext.issuer : undefined
                  const isEntry = requestContext.issuer === ''

                  // call hook
                  const result = await plugin.resolveId!(slash(id), importer, { isEntry })

                  if (result == null) {
                    return callback()
                  }

                  let resolved = typeof result === 'string' ? result : result.id

                  // TODO: support external
                  // const isExternal = typeof result === 'string' ? false : result.external === true

                  // If the resolved module does not exist,
                  // we treat it as a virtual module
                  if (!fs.existsSync(resolved)) {
                    resolved = plugin.__virtualModulePrefix + backSlash(resolved)
                    // webpack virtual module should pass in the correct path
                    plugin.__vfs!.writeModule(resolved, '')
                    plugin.__vfsModules!.add(resolved)
                  }

                  // construct the new request
                  const newRequest = {
                    ...request,
                    request: resolved
                  }

                  // redirect the resolver
                  resolver.doResolve(target, newRequest, null, resolveContext, callback)
                })
            }
          }

          compiler.options.resolve.plugins = compiler.options.resolve.plugins || []
          compiler.options.resolve.plugins.push(resolverPlugin)
        }

        // load hook
        if (plugin.load && plugin.__vfsModules) {
          compiler.options.module.rules.push({
            include (id) {
              return id != null && plugin.__vfsModules!.has(id)
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

        if (plugin.watchChange || plugin.buildStart) {
          compiler.hooks.make.tapPromise(plugin.name, async (compilation) => {
            const context = createContext(compilation)
            if (plugin.watchChange && (compiler.modifiedFiles || compiler.removedFiles)) {
              const promises:Promise<void>[] = []
              if (compiler.modifiedFiles) {
                compiler.modifiedFiles.forEach(file =>
                  promises.push(Promise.resolve(plugin.watchChange!.call(context, file, { event: 'update' })))
                )
              }
              if (compiler.removedFiles) {
                compiler.removedFiles.forEach(file =>
                  promises.push(Promise.resolve(plugin.watchChange!.call(context, file, { event: 'delete' })))
                )
              }
              await Promise.all(promises)
            }

            if (plugin.buildStart) {
              return await plugin.buildStart.call(context)
            }
          })
        }

        if (plugin.buildEnd) {
          compiler.hooks.emit.tapPromise(plugin.name, async (compilation) => {
            await plugin.buildEnd!.call(createContext(compilation))
          })
        }
      }
    }
  }
}
