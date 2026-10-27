import type { ResolvePluginInstance, Resolver } from 'webpack'
import type VirtualModulesPluginType from 'webpack-virtual-modules'
import type { HookFnMap, ResolvedUnpluginOptions, UnpluginContext, UnpluginContextMeta, UnpluginFactory, UnpluginInstance, WebpackCompiler } from '../types'
import type { PluginFilter } from '../utils/filter'
import fs from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { version as unpluginVersion } from '../../package.json'
import { normalizeObjectHook } from '../utils/filter'
import { toArray } from '../utils/general'
import { createCachedIdFilter, normalizeAbsolutePath, transformUse } from '../utils/webpack-like'
import { contextOptionsFromCompilation, createBuildContext, normalizeMessage } from './context'

const TRANSFORM_LOADER = resolve(
  // eslint-disable-next-line node/no-unsupported-features/node-builtins
  import.meta.dirname,
  import.meta.dev
    ? '../../dist/webpack/loaders/transform.mjs'
    : 'webpack/loaders/transform.mjs',
)

const LOAD_LOADER = resolve(
  // eslint-disable-next-line node/no-unsupported-features/node-builtins
  import.meta.dirname,
  import.meta.dev
    ? '../../dist/webpack/loaders/load.mjs'
    : 'webpack/loaders/load.mjs',
)

interface VirtualInputFileSystem {
  _inputFileSystem?: VirtualInputFileSystem
  _virtualFiles?: Record<string, unknown>
}

/** Innermost webpack input filesystem — the one that holds `_virtualFiles`. */
function virtualInputFileSystem(compiler: WebpackCompiler): VirtualInputFileSystem | undefined {
  let input = compiler.inputFileSystem as VirtualInputFileSystem | undefined
  while (input?._inputFileSystem)
    input = input._inputFileSystem
  return input
}

/**
 * Recreate a missing in-memory virtual file before webpack reads it.
 * A restored module already points at the `_virtual_` path, and that file
 * exists only in memory, so a later process ENOENTs unless this runs even
 * when `resolveId` does not.
 */
function ensureVirtualModule(plugin: ResolvedUnpluginOptions, compiler: WebpackCompiler, file: string | undefined) {
  if (!file || !plugin.__vfs)
    return
  const resource = normalizeAbsolutePath(file.split('?')[0].split('#')[0])
  if (!resource.startsWith(plugin.__virtualModulePrefix))
    return
  // The prefix is `<context>/_virtual_` with no trailing separator, so a real
  // file such as `_virtual_helper.js` also matches. resolveId already skipped
  // those with existsSync; buildModule must too or writeModule('') shadows them.
  if (fs.existsSync(resource))
    return
  const input = virtualInputFileSystem(compiler)
  if (input?._virtualFiles && Object.hasOwn(input._virtualFiles, resource))
    return
  plugin.__vfs.writeModule(resource, '')
  if (plugin.__vfsModules instanceof Set)
    plugin.__vfsModules.add(resource)
}

/** Webpack adapter for an unplugin factory. */
export function getWebpackPlugin<UserOptions = Record<string, never>>(
  factory: UnpluginFactory<UserOptions>,
): UnpluginInstance<UserOptions>['webpack'] {
  return (userOptions?: UserOptions) => {
    // eslint-disable-next-line ts/no-require-imports
    const VirtualModulesPlugin: typeof VirtualModulesPluginType = require('webpack-virtual-modules')

    return {
      apply(compiler: WebpackCompiler) {
        // We need the prefix of virtual modules to be an absolute path so webpack let's us load them (even if it's made up)
        // In the loader we strip the made up prefix path again
        const VIRTUAL_MODULE_PREFIX = resolve(compiler.options.context ?? process.cwd(), '_virtual_')

        const version = (compiler as any).webpack?.version
        const meta: UnpluginContextMeta = {
          framework: 'webpack',
          versions: { webpack: version, unplugin: unpluginVersion },
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
            let cachedResolveId: { hook: NonNullable<ResolvedUnpluginOptions['resolveId']>, cwd: string, filter: PluginFilter } | undefined
            let vfs = compiler.options.plugins.find(i => i instanceof VirtualModulesPlugin)
            if (!vfs) {
              vfs = new VirtualModulesPlugin()
              compiler.options.plugins.push(vfs)
            }
            const vfsModules = new Set<string>()
            plugin.__vfsModules = vfsModules
            plugin.__vfs = vfs

            compiler.hooks.compilation.tap(plugin.name, (compilation) => {
              compilation.hooks.buildModule.tap(plugin.name, (module) => {
                ensureVirtualModule(plugin, compiler, (module as { resource?: string }).resource)
              })
            })

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

                    try {
                      const id = normalizeAbsolutePath(request.request)

                      const requestContext = (request as unknown as { context: { issuer: string } }).context
                      let importer = requestContext.issuer !== ''
                        ? requestContext.issuer
                        : undefined
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

                      const hook = plugin.resolveId!
                      const cwd = process.cwd()
                      let handler: HookFnMap['resolveId']
                      if (cachedResolveId?.hook === hook && cachedResolveId.cwd === cwd) {
                        handler = typeof hook === 'function'
                          ? hook
                          : hook.handler
                      }
                      else {
                        const normalized = normalizeObjectHook('resolveId', hook)
                        handler = normalized.handler
                        cachedResolveId = { hook, cwd, filter: normalized.filter }
                      }
                      const { filter } = cachedResolveId
                      if (!filter(id))
                        return callback()

                      const resolveIdResult = await handler.call!({
                        ...context,
                        ...pluginContext,
                      }, id, importer, { isEntry })

                      if (error != null)
                        return callback(error)
                      if (resolveIdResult == null)
                        return callback()

                      let resolved = typeof resolveIdResult === 'string'
                        ? resolveIdResult
                        : resolveIdResult.id

                      const isExternal = typeof resolveIdResult === 'string'
                        ? false
                        : resolveIdResult.external === true
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
                        ensureVirtualModule(plugin, compiler, resolved)
                      }

                      // construct the new request
                      const newRequest = {
                        ...request,
                        request: resolved,
                      }

                      // redirect the resolver
                      resolver.doResolve(target, newRequest, null, resolveContext, callback)
                    }
                    catch (error) {
                      callback(error instanceof Error
                        ? error
                        : new Error(String(error)))
                    }
                  })
              },
            }

            compiler.options.resolve.plugins = compiler.options.resolve.plugins || []
            compiler.options.resolve.plugins.push(resolverPlugin)
          }

          // load hook
          if (plugin.load) {
            const filter = createCachedIdFilter(() => plugin.load!)
            compiler.options.module.rules.unshift({
              include(id) {
                return shouldLoad(id, plugin, externalModules, filter)
              },
              enforce: plugin.enforce,
              use: [
                {
                  loader: LOAD_LOADER,
                  options: {
                    plugin,
                  },
                },
              ],
              type: 'javascript/auto',
            })
          }

          // transform hook
          if (plugin.transform) {
            // Only the id filter applies here; the loader checks the code filter.
            const filter = createCachedIdFilter(() => plugin.transform!)
            compiler.options.module.rules.unshift({
              enforce: plugin.enforce,
              use(data: { resource?: string, resourceQuery?: string }) {
                return transformUse(data, plugin, TRANSFORM_LOADER, filter)
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
            const processAssetsStage = (compiler as any).webpack?.Compilation?.PROCESS_ASSETS_STAGE_ADDITIONAL
            if (processAssetsStage == null) {
              compiler.hooks.emit.tapPromise(plugin.name, async (compilation) => {
                await plugin.buildEnd!.call(createBuildContext(contextOptionsFromCompilation(compilation), compiler, compilation))
              })
            }
            else {
              compiler.hooks.thisCompilation.tap(plugin.name, (compilation) => {
                compilation.hooks.processAssets.tapPromise({
                  name: plugin.name,
                  stage: processAssetsStage,
                }, async () => {
                  await plugin.buildEnd!.call(createBuildContext(contextOptionsFromCompilation(compilation), compiler, compilation))
                })
              })
            }
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

export function shouldLoad(id: string, plugin: ResolvedUnpluginOptions, externalModules: Set<string>, filter: PluginFilter): boolean {
  if (id.startsWith(plugin.__virtualModulePrefix))
    id = decodeURIComponent(id.slice(plugin.__virtualModulePrefix.length))

  // load include filter
  if (plugin.loadInclude && !plugin.loadInclude(id))
    return false

  if (!filter(id))
    return false

  // Don't run load hook for external modules
  return !externalModules.has(id)
}
