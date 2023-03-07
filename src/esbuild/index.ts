import fs from 'fs'
import path from 'path'
import chokidar from 'chokidar'
import type { PartialMessage } from 'esbuild'
import type { SourceMap } from 'rollup'
import { Parser } from 'acorn'
import type { RawSourceMap } from '@ampproject/remapping'
import type { EsbuildPlugin, UnpluginBuildContext, UnpluginContext, UnpluginContextMeta, UnpluginFactory, UnpluginInstance, UnpluginOptions } from '../types'
import { combineSourcemaps, fixSourceMap, guessLoader, toArray } from './utils'

const watchListRecord: Record<string, chokidar.FSWatcher> = {}
const watchList: Set<string> = new Set()

let i = 0

export function getEsbuildPlugin<UserOptions = {}>(
  factory: UnpluginFactory<UserOptions>,
): UnpluginInstance<UserOptions>['esbuild'] {
  function processCodeWithSourceMap(map: SourceMap | null | undefined, code: string) {
    if (map) {
      if (!map.sourcesContent || map.sourcesContent.length === 0)
        map.sourcesContent = [code]

      map = fixSourceMap(map as RawSourceMap)
      code += `\n//# sourceMappingURL=${map.toUrl()}`
    }
    return code
  }

  return (userOptions?: UserOptions): EsbuildPlugin => {
    const meta: UnpluginContextMeta = {
      framework: 'esbuild',
    }
    const plugins = toArray(factory(userOptions!, meta))

    const setup = (plugin: UnpluginOptions): EsbuildPlugin['setup'] =>
      plugin.esbuild?.setup
      ?? ((pluginBuild) => {
        const { onStart, onEnd, onResolve, onLoad, initialOptions, esbuild: { build } } = pluginBuild
        meta.build = pluginBuild
        const onResolveFilter = plugin.esbuild?.onResolveFilter ?? /.*/
        const onLoadFilter = plugin.esbuild?.onLoadFilter ?? /.*/

        const context: UnpluginBuildContext = {
          parse(code: string, opts: any = {}) {
            return Parser.parse(code, {
              sourceType: 'module',
              ecmaVersion: 'latest',
              locations: true,
              ...opts,
            })
          },
          addWatchFile(id) {
            watchList.add(path.resolve(id))
          },
          emitFile(emittedFile) {
            const outFileName = emittedFile.fileName || emittedFile.name
            if (initialOptions.outdir && emittedFile.source && outFileName)
              fs.writeFileSync(path.resolve(initialOptions.outdir, outFileName), emittedFile.source)
          },
          getWatchFiles() {
            return [...watchList]
          },
        }

        // Ensure output directory exists for this.emitFile
        if (initialOptions.outdir && !fs.existsSync(initialOptions.outdir))
          fs.mkdirSync(initialOptions.outdir, { recursive: true })

        if (plugin.buildStart)
          onStart(() => plugin.buildStart!.call(context))

        if (plugin.buildEnd || plugin.writeBundle || initialOptions.watch) {
          const rebuild = () => build({
            ...initialOptions,
            watch: false,
          })

          onEnd(async () => {
            if (plugin.buildEnd)
              await plugin.buildEnd.call(context)

            if (plugin.writeBundle)
              await plugin.writeBundle()

            if (initialOptions.watch) {
              Object.keys(watchListRecord).forEach((id) => {
                if (!watchList.has(id)) {
                  watchListRecord[id].close()
                  delete watchListRecord[id]
                }
              })
              watchList.forEach((id) => {
                if (!Object.keys(watchListRecord).includes(id)) {
                  watchListRecord[id] = chokidar.watch(id)
                  watchListRecord[id].on('change', async () => {
                    await plugin.watchChange?.call(context, id, { event: 'update' })
                    rebuild()
                  })
                  watchListRecord[id].on('unlink', async () => {
                    await plugin.watchChange?.call(context, id, { event: 'delete' })
                    rebuild()
                  })
                }
              })
            }
          })
        }

        if (plugin.resolveId) {
          onResolve({ filter: onResolveFilter }, async (args) => {
            if (initialOptions.external?.includes(args.path)) {
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
            const id = args.path + args.suffix

            const errors: PartialMessage[] = []
            const warnings: PartialMessage[] = []
            const pluginContext: UnpluginContext = {
              error(message) { errors.push({ text: String(message) }) },
              warn(message) { warnings.push({ text: String(message) }) },
            }
            // because we use `namespace` to simulate virtual modules，
            // it is required to forward `resolveDir` for esbuild to find dependencies.
            const resolveDir = path.dirname(args.path)

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
                return null

              if (map)
                code = processCodeWithSourceMap(map, code)

              return { contents: code, errors, warnings, loader: guessLoader(args.path), resolveDir }
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
              return { contents: code, errors, warnings, loader: guessLoader(args.path), resolveDir }
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
