import type { ResolvePluginInstance, Resolver } from 'webpack'
import type { ResolvedUnpluginOptions, UnpluginContext, UnpluginContextMeta, UnpluginFactory, UnpluginInstance, WebpackCompiler } from '../types'
import fs from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import VirtualModulesPlugin from 'webpack-virtual-modules'
import { normalizeObjectHook } from '../utils/filter'
import { toArray } from '../utils/general'
import { normalizeAbsolutePath, transformUse } from '../utils/webpack-like'
import { contextOptionsFromCompilation, createBuildContext, normalizeMessage } from './context'

const TRANSFORM_LOADER = resolve(
  __dirname,
  __DEV__ ? '../../dist/webpack/loaders/transform' : 'webpack/loaders/transform',
)

const LOAD_LOADER = resolve(
  __dirname,
  __DEV__ ? '../../dist/webpack/loaders/load' : 'webpack/loaders/load',
)
export function getWebpackPlugin<UserOptions = Record<string, never>>(
  factory: UnpluginFactory<UserOptions>,
): UnpluginInstance<UserOptions>['webpack'] {
  return (userOptions?: UserOptions) => {
    return {
      apply(compiler: WebpackCompiler) {
        // We need the prefix of virtual modules to be an absolute path so webpack let's us load them (even if it's made up)
        // In the loader we strip the made up prefix path again
        const VIRTUAL_MODULE_PREFIX = resolve(compiler.options.context ?? process.cwd(), '_virtual_')

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

          const externalModules = new Set<string>()

          // resolveId hook
          if (plugin.resolveId) {
            let vfs = compiler.options.plugins.find(i => i instanceof VirtualModulesPlugin) as VirtualModulesPlugin
            if (!vfs) {
              vfs = new VirtualModulesPlugin()
              compiler.options.plugins.push(vfs)
            }
            const vfsModules = new Set<string>()
            plugin.__vfsModules = vfsModules
            plugin.__vfs = vfs

            const resolverPlugin: ResolvePluginInstance = {
              apply(resolver: Resolver) {
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
                    let importer = requestContext.issuer !== '' ? requestContext.issuer : undefined
                    const isEntry = requestContext.issuer === ''

                    if (importer?.startsWith(plugin.__virtualModulePrefix))
                      importer = decodeURIComponent(importer.slice(plugin.__virtualModulePrefix.length))

                    // call hook
                    // resolveContext.fileDependencies is typed as a WriteOnlySet, so make our own copy here
                    // so we can return it from getWatchFiles.
                    const fileDependencies = new Set<string>()
                    const context = createBuildContext({
                      addWatchFile(file) {
                        fileDependencies.add(file)
                        resolveContext.fileDependencies?.add(file)
                      },
                      getWatchFiles() {
                        return Array.from(fileDependencies)
                      },
                    }, compiler)
                    let error: Error | undefined
                    const pluginContext: UnpluginContext = {
                      error(msg) {
                        if (error == null)
                          error = normalizeMessage(msg)
                        else
                          console.error(`unplugin/webpack: multiple errors returned from resolveId hook: ${msg}`)
                      },
                      warn(msg) {
                        console.warn(`unplugin/webpack: warning from resolveId hook: ${msg}`)
                      },
                    }

                    const { handler, filter } = normalizeObjectHook('resolveId', plugin.resolveId!)
                    if (!filter(id))
                      return callback()

                    const resolveIdResult = await handler.call!({ ...context, ...pluginContext }, id, importer, { isEntry })

                    if (error != null)
                      return callback(error)
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
                      if (!vfsModules.has(resolved)) {
                        plugin.__vfs!.writeModule(resolved, '')
                        vfsModules.add(resolved)
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
                return shouldLoad(id, plugin, externalModules)
              },
              enforce: plugin.enforce,
              use: [{
                loader: LOAD_LOADER,
                options: {
                  plugin,
                },
              }],
              type: 'javascript/auto',
            })
          }

          // transform hook
          if (plugin.transform) {
            compiler.options.module.rules.unshift({
              enforce: plugin.enforce,
              use(data: { resource?: string, resourceQuery?: string }) {
                return transformUse(data, plugin, TRANSFORM_LOADER)
              },
            })
          }

          if (plugin.webpack)
            plugin.webpack(compiler)

          if (plugin.watchChange || plugin.buildStart) {
            compiler.hooks.make.tapPromise(plugin.name, async (compilation) => {
              const context = createBuildContext(contextOptionsFromCompilation(compilation), compiler, compilation)
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
              await plugin.buildEnd!.call(createBuildContext(contextOptionsFromCompilation(compilation), compiler, compilation))
            })
          }

          if (plugin.writeBundle) {
            compiler.hooks.afterEmit.tapPromise(plugin.name, async () => {
              await plugin.writeBundle!()
            })
          }
        }
      },
    }
  }
}

export function shouldLoad(id: string, plugin: ResolvedUnpluginOptions, externalModules: Set<string>): boolean {
  if (id.startsWith(plugin.__virtualModulePrefix))
    id = decodeURIComponent(id.slice(plugin.__virtualModulePrefix.length))

  // load include filter
  if (plugin.loadInclude && !plugin.loadInclude(id))
    return false

  const { filter } = normalizeObjectHook('load', plugin.load!)
  if (!filter(id))
    return false

  // Don't run load hook for external modules
  return !externalModules.has(id)
}
