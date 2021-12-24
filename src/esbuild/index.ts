import fs from 'fs'
import type { PartialMessage } from 'esbuild'
import type { SourceMap } from 'rollup'
import type { UnpluginContext, UnpluginContextMeta, UnpluginFactory, UnpluginInstance } from '../types'

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
                if (map) {
                  code += `\n//# sourceMappingURL=${map.toUrl()}`
                }
                // The default loader is 'js', should we change it to 'default'?
                return { contents: code, errors, warnings }
              }

              if (!plugin.transformInclude || plugin.transformInclude(args.path)) {
                if (!code) {
                  // What about binary files? (like images)
                  code = await fs.promises.readFile(args.path, 'utf8')
                }

                const result = await plugin.transform.call(pluginContext, code, args.path)
                if (typeof result === 'string') {
                  code = result
                } else if (typeof result === 'object' && result !== null) {
                  code = result.code
                  map = result.map
                }
                // Merge source maps?
              }

              if (code) {
                if (map) {
                  code += `\n//# sourceMappingURL=${map.toUrl()}`
                }
                return { contents: code, errors, warnings }
              }
            })
          }
        }
    }
  }
}
