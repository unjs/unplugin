import fs from 'fs'
import path from 'path'
import type { SourceMap } from 'rollup'
import type { RawSourceMap } from '@ampproject/remapping'
import type { EsbuildPlugin, UnpluginBuildContext, UnpluginContextMeta, UnpluginFactory, UnpluginInstance, UnpluginOptions } from '../types'
import { combineSourcemaps, createBuildContext, createPluginContext, guessLoader, processCodeWithSourceMap, toArray, unwrapLoader } from './utils'

let i = 0

export function getEsbuildPlugin<UserOptions = Record<string, never>>(
  factory: UnpluginFactory<UserOptions>,
): UnpluginInstance<UserOptions>['esbuild'] {
  return (userOptions?: UserOptions): EsbuildPlugin => {
    const meta: UnpluginContextMeta = {
      framework: 'esbuild',
    }
    const plugins = toArray(factory(userOptions!, meta))

    const setup = (plugin: UnpluginOptions): EsbuildPlugin['setup'] =>
      plugin.esbuild?.setup
      ?? ((build) => {
        meta.build = build
        const { onStart, onEnd, onResolve, onLoad, initialOptions } = build

        const onResolveFilter = plugin.esbuild?.onResolveFilter ?? /.*/
        const onLoadFilter = plugin.esbuild?.onLoadFilter ?? /.*/
        const loader = plugin.esbuild?.loader ?? guessLoader

        const context: UnpluginBuildContext = createBuildContext(initialOptions)

        if (plugin.buildStart)
          onStart(() => plugin.buildStart!.call(context))

        if (plugin.buildEnd || plugin.writeBundle) {
          onEnd(async () => {
            if (plugin.buildEnd)
              await plugin.buildEnd.call(context)

            if (plugin.writeBundle)
              await plugin.writeBundle()
          })
        }

        if (plugin.resolveId) {
          onResolve({ filter: onResolveFilter }, async (args) => {
            if (initialOptions.external?.includes(args.path)) {
            // We don't want to call the `resolveId` hook for external modules, since rollup doesn't do
            // that and we want to have consistent behaviour across bundlers
              return undefined
            }

            const { errors, warnings, watchFiles, pluginContext, buildContext } = createPluginContext()

            const isEntry = args.kind === 'entry-point'
            const result = await plugin.resolveId!.call(
              { ...context, ...pluginContext, ...buildContext },
              args.path,
              // We explicitly have this if statement here for consistency with the integration of other bundlers.
              // Here, `args.importer` is just an empty string on entry files whereas the equivalent on other bundlers is `undefined.`
              isEntry ? undefined : args.importer,
              { isEntry },
            )
            if (typeof result === 'string')
              return { path: result, namespace: plugin.name, errors, warnings, watchFiles }
            else if (typeof result === 'object' && result !== null)
              return { path: result.id, external: result.external, namespace: plugin.name, errors, warnings, watchFiles }
          })
        }

        if (plugin.load || plugin.transform) {
          onLoad({ filter: onLoadFilter }, async (args) => {
            const id = args.path + args.suffix

            const { errors, warnings, watchFiles, pluginContext, buildContext } = createPluginContext()

            // because we use `namespace` to simulate virtual modules，
            // it is required to forward `resolveDir` for esbuild to find dependencies.
            const resolveDir = path.dirname(args.path)

            let code: string | undefined, map: SourceMap | null | undefined

            if (plugin.load && (!plugin.loadInclude || plugin.loadInclude(id))) {
              const result = await plugin.load.call({ ...context, ...pluginContext, ...buildContext }, id)
              if (typeof result === 'string') {
                code = result
              }
              else if (typeof result === 'object' && result !== null) {
                code = result.code
                map = result.map as any
              }
            }

            if (!plugin.transform) {
              if (code === undefined)
                return null

              if (map)
                code = processCodeWithSourceMap(map, code)

              return { contents: code, errors, warnings, watchFiles, loader: unwrapLoader(loader, code, args.path), resolveDir }
            }

            if (!plugin.transformInclude || plugin.transformInclude(id)) {
              if (!code) {
              // caution: 'utf8' assumes the input file is not in binary.
              // if you want your plugin handle binary files, make sure to
              // `plugin.load()` them first.
                code = await fs.promises.readFile(args.path, 'utf8')
              }

              const result = await plugin.transform.call({ ...context, ...pluginContext, ...buildContext }, code, id)
              if (typeof result === 'string') {
                code = result
              }
              else if (typeof result === 'object' && result !== null) {
                code = result.code
                // if we already got sourcemap from `load()`,
                // combine the two sourcemaps
                if (map && result.map) {
                  map = combineSourcemaps(args.path, [
                    result.map as RawSourceMap,
                    map as RawSourceMap,
                  ]) as SourceMap
                }
                else {
                // otherwise, we always keep the last one, even if it's empty
                  map = result.map as any
                }
              }
            }

            if (code) {
              if (map)
                code = processCodeWithSourceMap(map, code)
              return { contents: code, errors, warnings, watchFiles, loader: unwrapLoader(loader, code, args.path), resolveDir }
            }
          })
        }
      })

    const setupMultiplePlugins = (): EsbuildPlugin['setup'] =>
      (build) => {
        for (const plugin of plugins)
          setup(plugin)(build)
      }

    return plugins.length === 1
      ? { name: plugins[0].name, setup: setup(plugins[0]) }
      : { name: meta.esbuildHostName ?? `unplugin-host-${i++}`, setup: setupMultiplePlugins() }
  }
}
