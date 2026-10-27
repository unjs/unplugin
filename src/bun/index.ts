import type { RawSourceMap } from '@jridgewell/remapping'
import type { BunPlugin, Loader } from 'bun'
import type { SourceMap } from 'rollup'
import type { TransformResult, UnpluginContextMeta, UnpluginFactory, UnpluginInstance } from '../types'
import { isAbsolute } from 'node:path'
import { version as unpluginVersion } from '../../package.json'
import { combineSourcemaps, processCodeWithSourceMap } from '../esbuild/utils'
import { normalizeObjectHook } from '../utils/filter'
import { toArray } from '../utils/general'
import { createBuildContext, createPluginContext, guessLoader, unwrapLoader } from './utils'

// Coerce plugin.name to satisfy Bun's namespace validator:
// https://github.com/oven-sh/bun/blob/12d77d1ac561771e9fa1d0822e954273248e7f9a/src/js/builtins/BundlerPlugin.ts#L215-L217
function toBunNamespace(name: string): string {
  return name.replace(/[^\w$-]/g, '-')
}

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
      versions: { bun: Bun.version, unplugin: unpluginVersion },
    }

    const plugins = toArray(factory(userOptions!, meta))

    return {
      name: (plugins.length === 1
        ? plugins[0].name
        : meta.bunHostName)
      ?? `unplugin-host:${plugins.map(p => p.name).join(':')}`,

      async setup(build) {
        const context = createBuildContext(build)

        for (const plugin of plugins) {
          await plugin.bun?.setup?.(build)
        }

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
          .filter(plugin => plugin.transform)
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
                console.warn('[unplugin]', typeof warning === 'string'
                  ? warning
                  : warning.message)
              }
              if (errors.length > 0) {
                const errorMessage = errors.map(e => typeof e === 'string'
                  ? e
                  : e.message).join('\n')
                throw new Error(`[unplugin] ${plugin.name}: ${errorMessage}`)
              }

              if (typeof result === 'string') {
                if (!isAbsolute(result)) {
                  return {
                    path: result,
                    namespace: toBunNamespace(plugin.name),
                  }
                }
                return { path: result }
              }
              else if (typeof result === 'object' && result !== null) {
                if (!isAbsolute(result.id)) {
                  return {
                    path: result.id,
                    external: result.external,
                    namespace: toBunNamespace(plugin.name),
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
          let activePlugin: typeof plugins[number] | undefined
          const sourcemapResults: Array<Extract<TransformResult, { code: string }>> | undefined = build.config.sourcemap && build.config.sourcemap !== 'none'
            ? []
            : undefined

          const namespaceLoadHooks = namespace === 'file'
            ? loadHooks
            : loadHooks.filter(h => h.plugin.name === namespace)

          for (const { plugin, handler, filter } of namespaceLoadHooks) {
            if (plugin.loadInclude && !plugin.loadInclude(id))
              continue
            if (!filter(id))
              continue

            const { mixedContext, errors, warnings } = createPluginContext(context)
            const result: TransformResult = await handler.call(mixedContext, id)

            for (const warning of warnings) {
              console.warn('[unplugin]', typeof warning === 'string'
                ? warning
                : warning.message)
            }
            if (errors.length > 0) {
              const errorMessage = errors.map(e => typeof e === 'string'
                ? e
                : e.message).join('\n')
              throw new Error(`[unplugin] ${plugin.name}: ${errorMessage}`)
            }

            if (typeof result === 'string') {
              code = result
              hasResult = true
              activePlugin = plugin
              break
            }
            else if (typeof result === 'object' && result !== null) {
              code = result.code
              sourcemapResults?.push(result)
              hasResult = true
              activePlugin = plugin
              break
            }
          }

          // Decide by id first, so a file no transform hook wants is never read
          const namespaceTransformHooks = (namespace === 'file'
            ? transformHooks
            : transformHooks.filter(h => h.plugin.name === namespace))
            .filter(({ plugin, idFilter }) => (!plugin.transformInclude || plugin.transformInclude(id)) && idFilter(id))

          if (!hasResult && namespace === 'file' && namespaceTransformHooks.length > 0) {
            code = await Bun.file(id).text()
          }

          if (code !== undefined) {
            for (const { plugin, handler, filter } of namespaceTransformHooks) {
              if (!filter(id, code))
                continue

              const { mixedContext, errors, warnings } = createPluginContext(context)
              const result: TransformResult = await handler.call(mixedContext, code, id)

              for (const warning of warnings) {
                console.warn('[unplugin]', typeof warning === 'string'
                  ? warning
                  : warning.message)
              }
              if (errors.length > 0) {
                const errorMessage = errors.map(e => typeof e === 'string'
                  ? e
                  : e.message).join('\n')
                throw new Error(`[unplugin] ${plugin.name}: ${errorMessage}`)
              }

              if (typeof result === 'string') {
                if (sourcemapResults && result !== code) {
                  sourcemapResults.length = 0
                }
                code = result
                hasResult = true
              }
              else if (typeof result === 'object' && result !== null) {
                code = result.code
                sourcemapResults?.push(result)
                hasResult = true
              }
            }
          }

          if (hasResult && code !== undefined) {
            const pluginLoader = activePlugin?.bun?.loader
            const resolvedLoader = (pluginLoader && unwrapLoader(pluginLoader, code, id))
              ?? loader
              ?? guessLoader(id)
            if (sourcemapResults && ['js', 'jsx', 'ts', 'tsx'].includes(resolvedLoader)) {
              const sourcemaps: RawSourceMap[] = []
              for (let i = sourcemapResults.length - 1; i >= 0; i--) {
                const result = sourcemapResults[i]!
                const map = result.map
                if (map) {
                  sourcemaps.push(typeof map === 'string'
                    ? JSON.parse(map)
                    : map as RawSourceMap)
                }
                else if (i > 0 && result.code !== sourcemapResults[i - 1]!.code) {
                  break
                }
              }
              if (sourcemaps.length) {
                const map = combineSourcemaps(id, sourcemaps, true)
                code = processCodeWithSourceMap(map as SourceMap, code)
              }
            }
            return {
              contents: code,
              loader: resolvedLoader,
            }
          }
        }

        if (loadHooks.length || transformHooks.length) {
          build.onLoad({ filter: /.*/, namespace: 'file' }, async (args) => {
            return processLoadTransform(args.path, 'file', args.loader)
          })
        }

        for (const pluginName of virtualModulePlugins) {
          build.onLoad({
            filter: /.*/,
            namespace: toBunNamespace(pluginName),
          }, async (args) => {
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
