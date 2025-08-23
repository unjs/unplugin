import type { BunPlugin } from 'bun'
import type { TransformResult, UnpluginContextMeta, UnpluginFactory, UnpluginInstance } from '../types'
import { isAbsolute } from 'node:path'
import { normalizeObjectHook } from '../utils/filter'
import { toArray } from '../utils/general'
import { createBuildContext, createPluginContext } from './utils'

export function getBunPlugin<UserOptions = Record<string, never>>(
  factory: UnpluginFactory<UserOptions>,
): UnpluginInstance<UserOptions>['bun'] {
  return (userOptions?: UserOptions): BunPlugin => {
    const meta: UnpluginContextMeta = {
      framework: 'bun',
    }

    const plugins = toArray(factory(userOptions!, meta))

    return {
      name: plugins.length === 1
        ? plugins[0].name
        : `unplugin-host:${plugins.map(p => p.name).join(':')}`,

      async setup(build) {
        const context = createBuildContext(build)

        for (const plugin of plugins) {
          if (plugin.buildStart) {
            await plugin.buildStart.call(context)
          }
        }

        const resolveIdHooks = plugins
          .filter(plugin => plugin.resolveId)
          .map(plugin => ({
            plugin,
            ...normalizeObjectHook('resolveId', plugin.resolveId!),
          }))

        const virtualModulePlugins = new Set<string>()
        for (const plugin of plugins) {
          if (plugin.resolveId && plugin.load) {
            virtualModulePlugins.add(plugin.name)
          }
        }

        if (resolveIdHooks.length) {
          build.onResolve({ filter: /.*/ }, async (args) => {
            for (const { plugin, handler, filter } of resolveIdHooks) {
              if (!filter(args.path))
                continue

              const { mixedContext } = createPluginContext(context)
              const isEntry = args.kind === 'entry-point-run' || args.kind === 'entry-point-build'

              const result = await handler.call(
                mixedContext,
                args.path,
                args.importer,
                { isEntry },
              )

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

        if (loadHooks.length || transformHooks.length) {
          build.onLoad({ filter: /.*/, namespace: 'file' }, async (args) => {
            const id = args.path
            let code: string | undefined
            let hasLoadResult = false

            for (const { plugin, handler, filter } of loadHooks) {
              if (plugin.loadInclude && !plugin.loadInclude(id))
                continue
              if (!filter(id))
                continue

              const { mixedContext } = createPluginContext(context)
              const result = await handler.call(mixedContext, id)

              if (typeof result === 'string') {
                code = result
                hasLoadResult = true
                break
              }
              else if (typeof result === 'object' && result !== null) {
                code = result.code
                hasLoadResult = true
                break
              }
            }

            if (!hasLoadResult && transformHooks.length > 0) {
              code = await Bun.file(id).text()
            }

            if (code !== undefined) {
              for (const { plugin, handler, filter } of transformHooks) {
                if (plugin.transformInclude && !plugin.transformInclude(id))
                  continue
                if (!filter(id, code))
                  continue

                const { mixedContext } = createPluginContext(context)
                const result: TransformResult = await handler.call(mixedContext, code, id)

                if (typeof result === 'string') {
                  code = result
                  hasLoadResult = true
                }
                else if (typeof result === 'object' && result !== null) {
                  code = result.code
                  hasLoadResult = true
                }
              }
            }

            if (hasLoadResult && code !== undefined) {
              return {
                contents: code,
                loader: args.loader,
              }
            }
          })
        }

        for (const plugin of plugins) {
          if (!virtualModulePlugins.has(plugin.name))
            continue

          const pluginLoadHooks = loadHooks.filter(h => h.plugin === plugin)
          const pluginTransformHooks = transformHooks.filter(h => h.plugin === plugin)

          if (pluginLoadHooks.length || pluginTransformHooks.length) {
            build.onLoad({ filter: /.*/, namespace: plugin.name }, async (args) => {
              const id = args.path
              let code: string | undefined
              let hasLoadResult = false

              for (const { handler, filter } of pluginLoadHooks) {
                if (plugin.loadInclude && !plugin.loadInclude(id))
                  continue
                if (!filter(id))
                  continue

                const { mixedContext } = createPluginContext(context)
                const result = await handler.call(mixedContext, id)

                if (typeof result === 'string') {
                  code = result
                  hasLoadResult = true
                  break
                }
                else if (typeof result === 'object' && result !== null) {
                  code = result.code
                  hasLoadResult = true
                  break
                }
              }

              if (code !== undefined) {
                for (const { handler, filter } of pluginTransformHooks) {
                  if (plugin.transformInclude && !plugin.transformInclude(id))
                    continue
                  if (!filter(id, code))
                    continue

                  const { mixedContext } = createPluginContext(context)
                  const result: TransformResult = await handler.call(mixedContext, code, id)

                  if (typeof result === 'string') {
                    code = result
                    hasLoadResult = true
                  }
                  else if (typeof result === 'object' && result !== null) {
                    code = result.code
                    hasLoadResult = true
                  }
                }
              }

              if (hasLoadResult && code !== undefined) {
                return {
                  contents: code,
                  loader: args.loader,
                }
              }
            })
          }
        }

        // Note: Bun doesn't support buildEnd/writeBundle hooks yet
        // Bun's plugin API doesn't have onEnd hook like esbuild
        // Track support: https://github.com/oven-sh/bun/issues/22061
      },
    }
  }
}
