import type { RspackPluginInstance } from '@rspack/core'
import type {
  ResolvedUnpluginOptions,
  UnpluginContext,
  UnpluginContextMeta,
  UnpluginFactory,
  UnpluginInstance,
} from '../types'
import fs from 'node:fs'
import { resolve } from 'node:path'
import { normalizeObjectHook } from '../utils/filter'
import { toArray } from '../utils/general'
import { normalizeAbsolutePath, transformUse } from '../utils/webpack-like'
import { createBuildContext, normalizeMessage } from './context'
import { decodeVirtualModuleId, encodeVirtualModuleId, FakeVirtualModulesPlugin, isVirtualModuleId } from './utils'

const TRANSFORM_LOADER = resolve(
  __dirname,
  __DEV__ ? '../../dist/rspack/loaders/transform.js' : 'rspack/loaders/transform',
)

const LOAD_LOADER = resolve(
  __dirname,
  __DEV__ ? '../../dist/rspack/loaders/load.js' : 'rspack/loaders/load',
)

export function getRspackPlugin<UserOptions = Record<string, never>>(
  factory: UnpluginFactory<UserOptions>,
): UnpluginInstance<UserOptions>['rspack'] {
  return (userOptions?: UserOptions): RspackPluginInstance => {
    return {
      apply(compiler) {
        // We need the prefix of virtual modules to be an absolute path so rspack lets us load them (even if it's made up)
        // In the loader we strip the made up prefix path again
        const VIRTUAL_MODULE_PREFIX = resolve(compiler.options.context ?? process.cwd(), 'node_modules/.virtual')

        const meta: UnpluginContextMeta = {
          framework: 'rspack',
          rspack: {
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
            const vfs = new FakeVirtualModulesPlugin(plugin)
            vfs.apply(compiler)
            plugin.__vfsModules = new Set()
            plugin.__vfs = vfs as any

            compiler.hooks.compilation.tap(plugin.name, (compilation, { normalModuleFactory }) => {
              normalModuleFactory.hooks.resolve.tapPromise(plugin.name, async (resolveData) => {
                const id = normalizeAbsolutePath(resolveData.request)

                const requestContext = resolveData.contextInfo
                let importer = requestContext.issuer !== '' ? requestContext.issuer : undefined
                const isEntry = requestContext.issuer === ''

                if (importer?.startsWith(plugin.__virtualModulePrefix))
                  importer = decodeURIComponent(importer.slice(plugin.__virtualModulePrefix.length))

                const context = createBuildContext(compiler, compilation)
                let error: Error | undefined
                const pluginContext: UnpluginContext = {
                  error(msg) {
                    if (error == null)
                      error = normalizeMessage(msg)
                    else
                      console.error(`unplugin/rspack: multiple errors returned from resolveId hook: ${msg}`)
                  },
                  warn(msg) {
                    console.warn(`unplugin/rspack: warning from resolveId hook: ${msg}`)
                  },
                }

                const { handler, filter } = normalizeObjectHook('resolveId', plugin.resolveId!)
                if (!filter(id))
                  return

                const resolveIdResult = await handler.call!({ ...context, ...pluginContext }, id, importer, { isEntry })

                if (error != null)
                  throw error
                if (resolveIdResult == null)
                  return

                let resolved = typeof resolveIdResult === 'string' ? resolveIdResult : resolveIdResult.id

                const isExternal = typeof resolveIdResult === 'string' ? false : resolveIdResult.external === true
                if (isExternal)
                  externalModules.add(resolved)

                // If the resolved module does not exist,
                // we treat it as a virtual module
                if (!fs.existsSync(resolved)) {
                  if (!plugin.__vfsModules!.has(resolved)) {
                    plugin.__vfsModules!.add(resolved)
                    await vfs.writeModule(resolved)
                  }
                  resolved = encodeVirtualModuleId(resolved, plugin)
                }

                resolveData.request = resolved
              })
            })
          }

          // load hook
          if (plugin.load) {
            compiler.options.module.rules.unshift({
              enforce: plugin.enforce,
              include(id) {
                if (isVirtualModuleId(id, plugin))
                  id = decodeVirtualModuleId(id, plugin)

                // load include filter
                if (plugin.loadInclude && !plugin.loadInclude(id))
                  return false

                const { filter } = normalizeObjectHook('load', plugin.load!)
                if (!filter(id))
                  return false

                // Don't run load hook for external modules
                return !externalModules.has(id)
              },
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
              use(data) {
                return transformUse(data, plugin, TRANSFORM_LOADER)
              },
            })
          }

          if (plugin.rspack)
            plugin.rspack(compiler)

          if (plugin.watchChange || plugin.buildStart) {
            compiler.hooks.make.tapPromise(plugin.name, async (compilation) => {
              const context = createBuildContext(compiler, compilation)
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
              await plugin.buildEnd!.call(createBuildContext(compiler, compilation))
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
