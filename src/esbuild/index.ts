import fs from 'fs'
import path from 'path'
import type { PartialMessage } from 'esbuild'
import type { SourceMap } from 'rollup'
import type { RawSourceMap } from '@ampproject/remapping/dist/types/types'
import type { UnpluginContext, UnpluginContextMeta, UnpluginFactory, UnpluginInstance } from '../types'
import { combineSourcemaps, fixSourceMap } from './utils'

export function getEsbuildPlugin <UserOptions = {}> (
  factory: UnpluginFactory<UserOptions>
): UnpluginInstance<UserOptions>['esbuild'] {
  return (userOptions?: UserOptions) => {
    const meta: UnpluginContextMeta = {
      framework: 'esbuild'
    }
    const plugin = factory(userOptions, meta)

    return {
      name: plugin.name,
      setup:
        plugin.esbuild?.setup ??
        function setup ({ onStart, onEnd, onResolve, onLoad }) {
          const onResolveFilter = plugin.esbuild?.onResolveFilter ?? /.*/
          const onLoadFilter = plugin.esbuild?.onLoadFilter ?? /.*/

          if (plugin.buildStart) {
            onStart(plugin.buildStart)
          }

          if (plugin.buildEnd) {
            onEnd(plugin.buildEnd)
          }

          if (plugin.resolveId) {
            onResolve({ filter: onResolveFilter }, async (args) => {
              const result = await plugin.resolveId!(args.path, args.importer)
              if (typeof result === 'string') {
                return { path: result, namespace: plugin.name }
              } else if (typeof result === 'object' && result !== null) {
                return { path: result.id, external: result.external, namespace: plugin.name }
              }
            })
          }

          if (plugin.load || plugin.transform) {
            onLoad({ filter: onLoadFilter }, async (args) => {
              const errors: PartialMessage[] = []
              const warnings: PartialMessage[] = []
              const pluginContext: UnpluginContext = {
                error (message) { errors.push({ text: String(message) }) },
                warn (message) { warnings.push({ text: String(message) }) }
              }
              // because we use `namespace` to simulate virtual modules，
              // it is required to forward `resolveDir` for esbuild to find dependencies.
              const resolveDir = path.dirname(args.path)

              let code: string | undefined, map: SourceMap | null | undefined

              if (plugin.load) {
                const result = await plugin.load.call(pluginContext, args.path)
                if (typeof result === 'string') {
                  code = result
                } else if (typeof result === 'object' && result !== null) {
                  code = result.code
                  map = result.map
                }
              }

              if (!plugin.transform) {
                if (code === undefined) {
                  return null
                }
                if (map) {
                  // fix missing sourcesContent, esbuild depends on it
                  if (!map.sourcesContent || map.sourcesContent.length === 0) {
                    map.sourcesContent = [code]
                  }
                  map = fixSourceMap(map as RawSourceMap)
                  code += `\n//# sourceMappingURL=${map.toUrl()}`
                }
                // loader: 'default' makes esbuild use the corresponding loader
                // to the id's extname. this is required for jsx plugins
                return { contents: code, errors, warnings, loader: 'default', resolveDir }
              }

              if (!plugin.transformInclude || plugin.transformInclude(args.path)) {
                if (!code) {
                  // caution: 'utf8' assumes the input file is not in binary.
                  // if you want your plugin handle binary files, make sure to
                  // `plugin.load()` them first.
                  code = await fs.promises.readFile(args.path, 'utf8')
                }

                const result = await plugin.transform.call(pluginContext, code, args.path)
                if (typeof result === 'string') {
                  code = result
                } else if (typeof result === 'object' && result !== null) {
                  code = result.code
                  // if we already got sourcemap from `load()`,
                  // combine the two sourcemaps
                  if (map && result.map) {
                    map = fixSourceMap(combineSourcemaps(args.path, [
                      result.map as RawSourceMap,
                      map as RawSourceMap
                    ]))
                  } else {
                    // otherwise, we always keep the last one, even if it's empty
                    map = result.map
                  }
                }
              }

              if (code) {
                if (map) {
                  if (!map.sourcesContent || map.sourcesContent.length === 0) {
                    map.sourcesContent = [code]
                  }
                  map = fixSourceMap(map as RawSourceMap)
                  code += `\n//# sourceMappingURL=${map.toUrl()}`
                }
                return { contents: code, errors, warnings, loader: 'default', resolveDir }
              }
            })
          }
        }
    }
  }
}
