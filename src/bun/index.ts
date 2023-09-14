import fs from 'fs'
import path from 'path'
import type { SourceMap } from 'rollup'
import type { RawSourceMap } from '@ampproject/remapping'
import type { BunPlugin, UnpluginBuildContext, UnpluginContext, UnpluginContextMeta, UnpluginFactory, UnpluginInstance, UnpluginOptions } from '../types'
import { combineSourcemaps, createBunContext, guessLoader, processCodeWithSourceMap, toArray } from './utils'

let i = 0

export function getBunPlugin<UserOptions = Record<string, never>>(
  factory: UnpluginFactory<UserOptions>,
): UnpluginInstance<UserOptions>['bun'] {
  return (userOptions?: UserOptions): BunPlugin => {
    const meta: UnpluginContextMeta = {
      framework: 'bun',
    }
    const plugins = toArray(factory(userOptions!, meta))

    const setup = (plugin: UnpluginOptions): BunPlugin['setup'] =>
      plugin.bun?.setup
      ?? ((build) => {
        meta.build = build
        const { onResolve, onLoad, config } = build

        const onResolveFilter = plugin.esbuild?.onResolveFilter ?? /.*/
        const onLoadFilter = plugin.esbuild?.onLoadFilter ?? /.*/

        const context: UnpluginBuildContext = createBunContext(config)

        if (plugin.resolveId) {
          onResolve({ filter: onResolveFilter }, async (args) => {
            if (config.external?.includes(args.path)) {
            // We don't want to call the `resolveId` hook for external modules, since rollup doesn't do
            // that and we want to have consistent behaviour across bundlers
              return undefined
            }

            const isEntry = args.kind === 'entry-point'
            const result = await plugin.resolveId!(
              args.path,
              // We explicitly have this if statement here for consistency with the integration of other bundelers.
              // Here, `args.importer` is just an empty string on entry files whereas the euqivalent on other bundlers is `undefined.`
              isEntry ? undefined : args.importer,
              { isEntry },
            )
            if (typeof result === 'string')
              return { path: result, namespace: plugin.name }
            else if (typeof result === 'object' && result !== null)
              return { path: result.id, external: result.external, namespace: plugin.name }
          })
        }

        if (plugin.load || plugin.transform) {
          onLoad({ filter: onLoadFilter }, async (args) => {
            const id = args.path

            const pluginContext: UnpluginContext = {
              error(message) {
                console.error(message)
              },
              warn(message) {
                console.warn(message)
              },
            }

            let code: string | undefined, map: SourceMap | null | undefined

            if (plugin.load && (!plugin.loadInclude || plugin.loadInclude(id))) {
              const result = await plugin.load.call(Object.assign(context, pluginContext), id)
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
                return undefined as never

              if (map)
                code = processCodeWithSourceMap(map, code)

              return { contents: code, loader: guessLoader(args.path) }
            }

            if (!plugin.transformInclude || plugin.transformInclude(id)) {
              if (!code) {
              // caution: 'utf8' assumes the input file is not in binary.
              // if you want your plugin handle binary files, make sure to
              // `plugin.load()` them first.
                code = await fs.promises.readFile(args.path, 'utf8')
              }

              const result = await plugin.transform.call(Object.assign(context, pluginContext), code, id)
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
              return { contents: code, loader: guessLoader(args.path) }
            }
            return undefined as never
          })
        }
      })

    const setupMultiplePlugins = (): BunPlugin['setup'] =>
      (build) => {
        for (const plugin of plugins)
          setup(plugin)(build)
      }

    return plugins.length === 1
      ? { name: plugins[0].name, setup: setup(plugins[0]) }
      : { name: meta.bunHostName ?? `unplugin-host-${i++}`, setup: setupMultiplePlugins() }
  }
}
