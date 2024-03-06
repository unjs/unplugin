import fs from 'fs'
import path from 'path'
import type { SourceMap } from 'rollup'
import type { RawSourceMap } from '@ampproject/remapping'
import type { OnLoadOptions, OnLoadResult, PluginBuild } from 'esbuild'
import type {
  EsbuildPlugin,
  UnpluginContextMeta,
  UnpluginFactory,
  UnpluginInstance,
  UnpluginOptions,
} from '../types'
import {
  combineSourcemaps,
  createBuildContext,
  createPluginContext,
  guessLoader,
  processCodeWithSourceMap,
  toArray,
  unwrapLoader,
} from './utils'

export interface OnTransformOptions {
  filter: RegExp
  namespace?: string
}

export interface OnTransformArgs {
  getContents: () => Promise<string>
  path: string
  namespace: string
  suffix: string
  pluginData: any
  with: Record<string, string>
}

type OnTransformCallback = (args: OnTransformArgs) =>
(OnLoadResult | null | undefined | Promise<OnLoadResult | null | undefined>)

export interface EsbuildPluginBuild extends PluginBuild {
  onTransform: (options: OnTransformOptions, callback: OnTransformCallback) => void
}

export function getEsbuildPlugin<UserOptions = Record<string, never>>(
  factory: UnpluginFactory<UserOptions>,
): UnpluginInstance<UserOptions>['esbuild'] {
  return (userOptions?: UserOptions): EsbuildPlugin => {
    const meta: UnpluginContextMeta = {
      framework: 'esbuild',
    }
    const plugins = toArray(factory(userOptions!, meta))

    const setupPlugins: EsbuildPlugin['setup'] = async (build) => {
      const setup = buildSetup(meta)
      interface Loader {
        options?: OnLoadOptions
        onLoadCb?: Parameters<PluginBuild['onLoad']>[1]
        onTransformCb?: OnTransformCallback
      }
      const loaders: Loader[] = []

      for (const plugin of plugins) {
        const loader: Loader = {}
        await setup(plugin)({
          ...build,
          onLoad(_options, callback) {
            loader.options = _options
            loader.onLoadCb = callback
          },
          onTransform(_options, callback) {
            loader.options ||= _options
            loader.onTransformCb = callback
          },
        } as EsbuildPluginBuild)

        // skip if no load & transform hooks
        if (loader.onLoadCb || loader.onTransformCb)
          loaders.push(loader)
      }

      if (loaders.length) {
        build.onLoad(loaders.length === 1 ? loaders[0].options! : { filter: /.*/ }, async (args) => {
          function checkFilter(options: Loader['options']) {
            return loaders.length === 1 || !options?.filter || options.filter.test(args.path)
          }

          let result: OnLoadResult | null | undefined
          for (const { options, onLoadCb } of loaders) {
            if (!checkFilter(options))
              continue

            if (onLoadCb)
              result = await onLoadCb!(args)
            if (result?.contents)
              break
          }

          let fsContentsCache: string | undefined

          for (const { options, onTransformCb } of loaders) {
            if (!checkFilter(options))
              continue

            if (onTransformCb) {
              const newArgs: OnTransformArgs = {
                ...result,
                ...args,
                async getContents() {
                  if (result?.contents)
                    return result.contents as string

                  if (fsContentsCache)
                    return fsContentsCache

                  // caution: 'utf8' assumes the input file is not in binary.
                  // if you want your plugin handle binary files, make sure to
                  // `plugin.load()` them first.
                  return (fsContentsCache = await fs.promises.readFile(args.path, 'utf8'))
                },
              }

              const _result = await onTransformCb(newArgs)
              if (_result?.contents)
                result = _result
            }
          }

          if (result?.contents)
            return result
        })
      }
    }

    return {
      name: (plugins.length === 1 ? plugins[0].name : meta.esbuildHostName)
      ?? `unplugin-host:${plugins.map(p => p.name).join(':')}`,
      setup: setupPlugins,
    }
  }
}

function buildSetup(meta: UnpluginContextMeta & { framework: 'esbuild' }) {
  return (plugin: UnpluginOptions): EsbuildPlugin['setup'] => {
    if (plugin.esbuild?.setup)
      return plugin.esbuild.setup as EsbuildPlugin['setup']

    return (build) => {
      meta.build = build as EsbuildPluginBuild
      const { onStart, onEnd, onResolve, onLoad, onTransform, initialOptions }
        = build as EsbuildPluginBuild

      const onResolveFilter = plugin.esbuild?.onResolveFilter ?? /.*/
      const onLoadFilter = plugin.esbuild?.onLoadFilter ?? /.*/

      const loader = plugin.esbuild?.loader ?? guessLoader
      const context = createBuildContext(initialOptions)

      if (plugin.esbuild?.config)
        plugin.esbuild.config.call(context, initialOptions)

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
            // We don't want to call the `resolveId` hook for external modules,
            // since rollup doesn't do that and we want to
            // have consistent behaviour across bundlers
            return undefined
          }

          const { errors, warnings, mixedContext }
            = createPluginContext(context)

          const isEntry = args.kind === 'entry-point'
          const result = await plugin.resolveId!.call(
            mixedContext,
            args.path,
            // We explicitly have this if statement here for consistency with
            // the integration of other bundlers.
            // Here, `args.importer` is just an empty string on entry files
            // whereas the equivalent on other bundlers is`undefined.`
            isEntry ? undefined : args.importer,
            { isEntry },
          )
          if (typeof result === 'string') {
            return {
              path: result,
              namespace: plugin.name,
              errors,
              warnings,
              watchFiles: mixedContext.getWatchFiles(),
            }
          }
          else if (typeof result === 'object' && result !== null) {
            return {
              path: result.id,
              external: result.external,
              namespace: plugin.name,
              errors,
              warnings,
              watchFiles: mixedContext.getWatchFiles(),
            }
          }
        })
      }

      if (plugin.load) {
        onLoad({ filter: onLoadFilter }, async (args) => {
          const id = args.path + args.suffix

          const { errors, warnings, mixedContext }
            = createPluginContext(context)

          // because we use `namespace` to simulate virtual modules，
          // it is required to forward `resolveDir` for esbuild to find dependencies.
          const resolveDir = path.dirname(args.path)

          let code: string | undefined, map: SourceMap | null | undefined

          if (plugin.load && (!plugin.loadInclude || plugin.loadInclude(id))) {
            const result = await plugin.load.call(mixedContext, id)
            if (typeof result === 'string') {
              code = result
            }
            else if (typeof result === 'object' && result !== null) {
              code = result.code
              map = result.map as any
            }
          }

          if (code === undefined)
            return null

          if (map)
            code = processCodeWithSourceMap(map, code)

          return {
            contents: code,
            errors,
            warnings,
            watchFiles: mixedContext.getWatchFiles(),
            loader: unwrapLoader(loader, code, args.path),
            resolveDir,
          }
        })
      }

      if (plugin.transform) {
        onTransform({ filter: onLoadFilter }, async (args) => {
          const id = args.path + args.suffix

          if (plugin.transformInclude && !plugin.transformInclude(id))
            return

          const { mixedContext, errors, warnings } = createPluginContext(context)
          const resolveDir = path.dirname(args.path)

          let code = await args.getContents()
          let map: SourceMap | null | undefined
          const result = await plugin.transform!.call(mixedContext, code, id)
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

          if (code) {
            if (map)
              code = processCodeWithSourceMap(map, code)
            return {
              contents: code,
              errors,
              warnings,
              watchFiles: mixedContext.getWatchFiles(),
              loader: unwrapLoader(loader, code, args.path),
              resolveDir,
            }
          }
        })
      }
    }
  }
}
