import type { BunPlugin, Loader } from 'bun'
import type { TransformResult, UnpluginContextMeta, UnpluginFactory, UnpluginInstance } from '../types'
import { isAbsolute } from 'node:path'
import { normalizeObjectHook } from '../utils/filter'
import { toArray } from '../utils/general'
import { createBuildContext, createPluginContext, guessLoader } from './utils'

export function getBunPlugin<UserOptions = Record<string, never>>(
  factory: UnpluginFactory<UserOptions>,
): UnpluginInstance<UserOptions>['bun'] {
  return (userOptions?: UserOptions): BunPlugin => {
    if (typeof Bun === 'undefined') {
      throw new ReferenceError('Bun is not supported in this environment')
    }

    if (!Bun.semver.satisfies(Bun.version, '>=1.2.22')) {
      throw new Error('Bun 1.2.22 or higher is required, please upgrade Bun')
    }

    const meta: UnpluginContextMeta = {
      framework: 'bun',
      frameworkVersion: Bun.version,
    }

    const plugins = toArray(factory(userOptions!, meta))

    return {
      name: (plugins.length === 1 ? plugins[0].name : meta.bunHostName)
        ?? `unplugin-host:${plugins.map(p => p.name).join(':')}`,

      async setup(build) {
        const context = createBuildContext(build)

        if (plugins.some(plugin => plugin.buildStart)) {
          build.onStart(async () => {
            for (const plugin of plugins) {
              if (plugin.buildStart) {
                await plugin.buildStart.call(context)
              }
            }
          })
        }

        const resolveIdHooks = plugins
          .filter(plugin => plugin.resolveId)
          .map(plugin => ({
            plugin,
            ...normalizeObjectHook('resolveId', plugin.resolveId!),
          }))

        const loadHooks = plugins
          .filter(plugin => plugin.load)
          .map(plugin => ({
            plugin,
            ...normalizeObjectHook('load', plugin.load!),
          }))

        const transformHooks = plugins
          .filter(plugin => plugin.transform || plugin.transformInclude)
          .map(plugin => ({
            plugin,
            ...normalizeObjectHook('transform', plugin.transform!),
          }))

        const virtualModulePlugins = new Set<string>()
        for (const plugin of plugins) {
          if (plugin.resolveId && plugin.load) {
            virtualModulePlugins.add(plugin.name)
          }
        }

        if (resolveIdHooks.length) {
          build.onResolve({ filter: /.*/ }, async (args) => {
            if (build.config?.external?.includes(args.path)) {
              return
            }

            for (const { plugin, handler, filter } of resolveIdHooks) {
              if (!filter(args.path))
                continue

              const { mixedContext, errors, warnings } = createPluginContext(context)
              const isEntry = args.kind === 'entry-point-run' || args.kind === 'entry-point-build'

              const result = await handler.call(
                mixedContext,
                args.path,
                isEntry ? undefined : args.importer,
                { isEntry },
              )

              for (const warning of warnings) {
                console.warn('[unplugin]', typeof warning === 'string' ? warning : warning.message)
              }
              if (errors.length > 0) {
                const errorMessage = errors.map(e => typeof e === 'string' ? e : e.message).join('\n')
                throw new Error(`[unplugin] ${plugin.name}: ${errorMessage}`)
              }

              if (typeof result === 'string') {
                if (!isAbsolute(result)) {
                  return {
                    path: result,
                    namespace: plugin.name,
                  }
                }
                return { path: result }
              }
              else if (typeof result === 'object' && result !== null) {
                if (!isAbsolute(result.id)) {
                  return {
                    path: result.id,
                    external: result.external,
                    namespace: plugin.name,
                  }
                }
                return {
                  path: result.id,
                  external: result.external,
                }
              }
            }
          })
        }

        async function processLoadTransform(
          id: string,
          namespace: string,
          loader?: Loader,
        ): Promise<{ contents: string, loader: Loader } | undefined> {
          let code: string | undefined
          let hasResult = false

          const namespaceLoadHooks = namespace === 'file'
            ? loadHooks
            : loadHooks.filter(h => h.plugin.name === namespace)

          for (const { plugin, handler, filter } of namespaceLoadHooks) {
            if (plugin.loadInclude && !plugin.loadInclude(id))
              continue
            if (!filter(id))
              continue

            const { mixedContext, errors, warnings } = createPluginContext(context)
            const result = await handler.call(mixedContext, id)

            for (const warning of warnings) {
              console.warn('[unplugin]', typeof warning === 'string' ? warning : warning.message)
            }
            if (errors.length > 0) {
              const errorMessage = errors.map(e => typeof e === 'string' ? e : e.message).join('\n')
              throw new Error(`[unplugin] ${plugin.name}: ${errorMessage}`)
            }

            if (typeof result === 'string') {
              code = result
              hasResult = true
              break
            }
            else if (typeof result === 'object' && result !== null) {
              code = result.code
              hasResult = true
              break
            }
          }

          if (!hasResult && namespace === 'file' && transformHooks.length > 0) {
            code = await Bun.file(id).text()
          }

          if (code !== undefined) {
            const namespaceTransformHooks = namespace === 'file'
              ? transformHooks
              : transformHooks.filter(h => h.plugin.name === namespace)

            for (const { plugin, handler, filter } of namespaceTransformHooks) {
              if (plugin.transformInclude && !plugin.transformInclude(id))
                continue
              if (!filter(id, code))
                continue

              const { mixedContext, errors, warnings } = createPluginContext(context)
              const result: TransformResult = await handler.call(mixedContext, code, id)

              for (const warning of warnings) {
                console.warn('[unplugin]', typeof warning === 'string' ? warning : warning.message)
              }
              if (errors.length > 0) {
                const errorMessage = errors.map(e => typeof e === 'string' ? e : e.message).join('\n')
                throw new Error(`[unplugin] ${plugin.name}: ${errorMessage}`)
              }

              if (typeof result === 'string') {
                code = result
                hasResult = true
              }
              else if (typeof result === 'object' && result !== null) {
                code = result.code
                hasResult = true
              }
            }
          }

          if (hasResult && code !== undefined) {
            return {
              contents: code,
              loader: loader ?? guessLoader(id),
            }
          }
        }

        if (loadHooks.length || transformHooks.length) {
          build.onLoad({ filter: /.*/, namespace: 'file' }, async (args) => {
            return processLoadTransform(args.path, 'file', args.loader)
          })
        }

        for (const pluginName of virtualModulePlugins) {
          build.onLoad({ filter: /.*/, namespace: pluginName }, async (args) => {
            return processLoadTransform(args.path, pluginName, args.loader)
          })
        }

        if (plugins.some(plugin => plugin.buildEnd || plugin.writeBundle)) {
          build.onEnd(async () => {
            for (const plugin of plugins) {
              if (plugin.buildEnd) {
                await plugin.buildEnd.call(context)
              }
              if (plugin.writeBundle) {
                await plugin.writeBundle()
              }
            }
          })
        }
      },
    }
  }
}
