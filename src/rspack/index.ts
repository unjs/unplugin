import fs from 'fs'
import { resolve } from 'path'
import type { RspackPluginInstance } from '@rspack/core'
import { normalizeAbsolutePath, toArray, transformUse } from '../utils'
import type {
  ResolvedUnpluginOptions,
  UnpluginContext,
  UnpluginContextMeta,
  UnpluginFactory,
  UnpluginInstance,
} from '../types'
import { contextOptionsFromCompilation, createBuildContext, normalizeMessage } from './context'
import { decodeVirtualModuleId, encodeVirtualModuleId } from './utils'

const TRANSFORM_LOADER = resolve(
  __dirname,
  __DEV__ ? '../../dist/rspack/loaders/transform.js' : 'rspack/loaders/transform',
)

const LOAD_LOADER = resolve(
  __dirname,
  __DEV__ ? '../../dist/rspack/loaders/load.js' : 'rspack/loaders/load',
)

const VIRTUAL_MODULE_PATH = resolve(__dirname, __DEV__ ? '../../dist/rspack/virtual.js' : 'rspack/virtual.js')
const VIRTUAL_MODULE_QUERY_PREFIX = '?unplugin_rspack_virtual='
const VIRTUAL_MODULE_PREFIX = VIRTUAL_MODULE_PATH + VIRTUAL_MODULE_QUERY_PREFIX

export function getRspackPlugin<UserOptions = Record<string, never>>(
  factory: UnpluginFactory<UserOptions>,
): UnpluginInstance<UserOptions>['rspack'] {
  return (userOptions?: UserOptions): RspackPluginInstance => {
    return {
      apply(compiler) {
        const injected = compiler.$unpluginContext || {}
        compiler.$unpluginContext = injected

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

          // inject context object to share with loaders
          injected[plugin.name] = plugin

          compiler.hooks.thisCompilation.tap(plugin.name, (compilation) => {
            if (typeof compilation.hooks.childCompiler === 'undefined')
              throw new Error('`compilation.hooks.childCompiler` only support by @rspack/core>=0.4.1')
            compilation.hooks.childCompiler.tap(plugin.name, (childCompiler) => {
              childCompiler.$unpluginContext = injected
            })
          })

          const externalModules = new Set<string>()

          // resolveId hook
          if (plugin.resolveId) {
            compiler.hooks.compilation.tap(plugin.name, (compilation, { normalModuleFactory }) => {
              normalModuleFactory.hooks.factorize.tapPromise(plugin.name, async (resolveData) => {
                const id = normalizeAbsolutePath(resolveData.request)

                const requestContext = resolveData.contextInfo
                const importer = requestContext.issuer !== '' ? requestContext.issuer : undefined
                const isEntry = requestContext.issuer === ''

                const context = createBuildContext(contextOptionsFromCompilation(compilation), compilation)
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
                const resolveIdResult = await plugin.resolveId!.call!({ ...context, ...pluginContext }, id, importer, { isEntry })

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
                if (!fs.existsSync(resolved))
                  resolved = encodeVirtualModuleId(resolved, plugin)

                resolveData.request = resolved
              })
            })
          }

          // load hook
          if (plugin.load) {
            compiler.options.module.rules.unshift({
              enforce: plugin.enforce,
              include(id) {
                // always return true for virtual module, filter it in resourceQuery
                if (id === VIRTUAL_MODULE_PATH)
                  return true

                // load include filter
                if (plugin.loadInclude && !plugin.loadInclude(id))
                  return false

                // Don't run load hook for external modules
                return !externalModules.has(id)
              },
              resourceQuery(query) {
                if (!query.startsWith(VIRTUAL_MODULE_QUERY_PREFIX))
                  return true

                // filter the decoded virtual module id
                const id = decodeVirtualModuleId(VIRTUAL_MODULE_PATH + query, plugin)

                // load include filter
                if (plugin.loadInclude && !plugin.loadInclude(id))
                  return false

                // Don't run load hook for external modules
                return !externalModules.has(id)
              },
              use: [{
                loader: LOAD_LOADER,
                options: {
                  unpluginName: plugin.name,
                },
              }],
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
              const context = createBuildContext(contextOptionsFromCompilation(compilation), compilation)
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
              await plugin.buildEnd!.call(createBuildContext(contextOptionsFromCompilation(compilation), compilation))
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
