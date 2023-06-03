import fs from 'fs'
import { resolve } from 'path'
import VirtualModulesPlugin from 'webpack-virtual-modules'
import type { ResolvePluginInstance, RuleSetUseItem } from 'webpack'
import type { ResolvedUnpluginOptions, UnpluginContextMeta, UnpluginFactory, UnpluginInstance, WebpackCompiler } from '../types'
import { normalizeAbsolutePath, toArray } from '../utils'
import { createContext } from './context'

const TRANSFORM_LOADER = resolve(
  __dirname,
  __DEV__ ? '../../dist/webpack/loaders/transform' : 'webpack/loaders/transform',
)

const LOAD_LOADER = resolve(
  __dirname,
  __DEV__ ? '../../dist/webpack/loaders/load' : 'webpack/loaders/load',
)

// We need the prefix of virtual modules to be an absolute path so webpack let's us load them (even if it's made up)
// In the loader we strip the made up prefix path again
const VIRTUAL_MODULE_PREFIX = resolve(process.cwd(), '_virtual_')

export function getWebpackPlugin<UserOptions = {}>(
  factory: UnpluginFactory<UserOptions>,
): UnpluginInstance<UserOptions>['webpack'] {
  return (userOptions?: UserOptions) => {
    return {
      apply(compiler: WebpackCompiler) {
        const injected = compiler.$unpluginContext || {}
        compiler.$unpluginContext = injected

        const meta: UnpluginContextMeta = {
          framework: 'webpack',
          webpack: {
            compiler,
          },
        }

        const rawPlugins = toArray(factory(userOptions!, meta))
        for (const rawPlugin of rawPlugins) {
          const plugin = Object.assign(
            rawPlugin,
            {
              __unpluginMeta: meta,
              __virtualModulePrefix: VIRTUAL_MODULE_PREFIX,
            },
          ) as ResolvedUnpluginOptions

          // inject context object to share with loaders
          injected[plugin.name] = plugin

          compiler.hooks.thisCompilation.tap(plugin.name, (compilation) => {
            compilation.hooks.childCompiler.tap(plugin.name, (childCompiler) => {
              childCompiler.$unpluginContext = injected
            })
          })

          const externalModules = new Set<string>()

          // transform hook
          if (plugin.transform) {
            const useLoader: RuleSetUseItem[] = [{
              loader: `${TRANSFORM_LOADER}?unpluginName=${encodeURIComponent(plugin.name)}`,
            }]
            const useNone: RuleSetUseItem[] = []
            compiler.options.module.rules.unshift({
              enforce: plugin.enforce,
              use: (data: { resource: string | null; resourceQuery: string }) => {
                if (data.resource == null)
                  return useNone

                const id = normalizeAbsolutePath(data.resource + (data.resourceQuery || ''))
                if (!plugin.transformInclude || plugin.transformInclude(id))
                  return useLoader

                return useNone
              },
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
              apply(resolver) {
                const target = resolver.ensureHook('resolve')

                resolver
                  .getHook('resolve')
                  .tapAsync(plugin.name, async (request, resolveContext, callback) => {
                    if (!request.request)
                      return callback()

                    // filter out invalid requests
                    if (normalizeAbsolutePath(request.request).startsWith(plugin.__virtualModulePrefix))
                      return callback()

                    const id = normalizeAbsolutePath(request.request)

                    const requestContext = (request as unknown as { context: { issuer: string } }).context
                    const importer = requestContext.issuer !== '' ? requestContext.issuer : undefined
                    const isEntry = requestContext.issuer === ''

                    // call hook
                    const resolveIdResult = await plugin.resolveId!(id, importer, { isEntry })

                    if (resolveIdResult == null)
                      return callback()

                    let resolved = typeof resolveIdResult === 'string' ? resolveIdResult : resolveIdResult.id

                    const isExternal = typeof resolveIdResult === 'string' ? false : resolveIdResult.external === true
                    if (isExternal)
                      externalModules.add(resolved)

                    // If the resolved module does not exist,
                    // we treat it as a virtual module
                    if (!fs.existsSync(resolved)) {
                      resolved = normalizeAbsolutePath(
                        plugin.__virtualModulePrefix
                        + encodeURIComponent(resolved), // URI encode id so webpack doesn't think it's part of the path
                      )

                      // webpack virtual module should pass in the correct path
                      // https://github.com/unjs/unplugin/pull/155
                      if (!plugin.__vfsModules!.has(resolved)) {
                        plugin.__vfs!.writeModule(resolved, '')
                        plugin.__vfsModules!.add(resolved)
                      }
                    }

                    // construct the new request
                    const newRequest = {
                      ...request,
                      request: resolved,
                    }

                    // redirect the resolver
                    resolver.doResolve(target, newRequest, null, resolveContext, callback)
                  })
              },
            }

            compiler.options.resolve.plugins = compiler.options.resolve.plugins || []
            compiler.options.resolve.plugins.push(resolverPlugin)
          }

          // load hook
          if (plugin.load) {
            compiler.options.module.rules.unshift({
              include(id) {
                if (id.startsWith(plugin.__virtualModulePrefix))
                  id = decodeURIComponent(id.slice(plugin.__virtualModulePrefix.length))

                // load include filter
                if (plugin.loadInclude && !plugin.loadInclude(id))
                  return false

                // Don't run load hook for external modules
                return !externalModules.has(id)
              },
              enforce: plugin.enforce,
              use: [{
                loader: LOAD_LOADER,
                options: {
                  unpluginName: plugin.name,
                },
              }],
            })
          }

          if (plugin.webpack)
            plugin.webpack(compiler)

          if (plugin.watchChange || plugin.buildStart) {
            compiler.hooks.make.tapPromise(plugin.name, async (compilation) => {
              const context = createContext(compilation)
              if (plugin.watchChange && (compiler.modifiedFiles || compiler.removedFiles)) {
                const promises: Promise<void>[] = []
                if (compiler.modifiedFiles) {
                  compiler.modifiedFiles.forEach(file =>
                    promises.push(Promise.resolve(plugin.watchChange!.call(context, file, { event: 'update' }))),
                  )
                }
                if (compiler.removedFiles) {
                  compiler.removedFiles.forEach(file =>
                    promises.push(Promise.resolve(plugin.watchChange!.call(context, file, { event: 'delete' }))),
                  )
                }
                await Promise.all(promises)
              }

              if (plugin.buildStart)
                return await plugin.buildStart.call(context)
            })
          }

          if (plugin.buildEnd) {
            compiler.hooks.emit.tapPromise(plugin.name, async (compilation) => {
              await plugin.buildEnd!.call(createContext(compilation))
            })
          }

          if (plugin.writeBundle) {
            compiler.hooks.afterEmit.tap(plugin.name, () => {
              plugin.writeBundle!()
            })
          }
        }
      },
    }
  }
}
