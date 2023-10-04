import path from 'path'
import type {
  PluginLoadHookParam,
  PluginLoadHookResult,
  PluginResolveHookParam,
  PluginTransformHookParam,
  PluginTransformHookResult,
} from '@farmfe/core/binding'
import type { CompilationContext, JsPlugin } from '@farmfe/core'
import type {
  TransformResult,
  UnpluginContext,
  UnpluginContextMeta,
  UnpluginFactory,
  UnpluginInstance,
  UnpluginOptions,
} from '../types'
import { toArray } from '../utils'
import type { WatchChangeEvents } from './utils'
import {
  convertEnforceToPriority,
  convertWatchEventChange,
  customParseQueryString,
  getContentValue,
  guessIdLoader,
  isObject,
  isString,
  transformQuery,
} from './utils'
import { createFarmContext } from './context'

export function getFarmPlugin<
  UserOptions = Record<string, never>, Nested extends boolean = boolean,
>(factory: UnpluginFactory<UserOptions, Nested>) {
  return ((userOptions?: UserOptions) => {
    const meta: UnpluginContextMeta = {
      framework: 'farm',
    }
    const rawPlugins = toArray(factory(userOptions!, meta))
    const plugins = rawPlugins.map((rawPlugin) => {
      const plugin = toFarmPlugin(rawPlugin) as JsPlugin
      if (rawPlugin.farm)
        Object.assign(plugin, rawPlugin.farm)

      return plugin
    })

    return plugins.length === 1 ? plugins[0] : plugins
  }) as UnpluginInstance<UserOptions>['farm']
}

export function toFarmPlugin(plugin: UnpluginOptions): JsPlugin {
  const farmPlugin: JsPlugin = {
    name: plugin.name,
    priority: convertEnforceToPriority(plugin.enforce),
  }
  if (plugin.farm) {
    const { config, configDevServer, updateModules } = plugin.farm
    if (config)
      farmPlugin.config = config
    if (configDevServer)
      farmPlugin.configDevServer = configDevServer
    if (updateModules)
      farmPlugin.updateModules = updateModules
  }

  if (plugin.buildStart) {
    const _buildStart = plugin.buildStart
    farmPlugin.buildStart = {
      async executor(_, context) {
        await _buildStart.call(createFarmContext(context!))
      },
    } as JsPlugin['buildStart']
  }

  if (plugin.resolveId) {
    const _resolveId = plugin.resolveId
    farmPlugin.resolve = {
      filters: { sources: ['.*'], importers: ['.*'] },
      async executor(params: PluginResolveHookParam) {
        const resolvedIdPath = path.resolve(
          process.cwd(),
          params.importer?.relativePath ?? '',
        )
        let isEntry = false
        if (isObject(params.kind) && 'entry' in params.kind) {
          const kindWithEntry = params.kind as { entry: string }
          isEntry = kindWithEntry.entry === 'index'
        }
        const resolveIdResult = await _resolveId(
          params.source,
          resolvedIdPath ?? null,
          { isEntry },
        )
        if (isString(resolveIdResult)) {
          return {
            resolvedPath: resolveIdResult,
            query: customParseQueryString(resolveIdResult),
            sideEffects: false,
            external: false,
            meta: {},
          }
        }
        else if (isObject(resolveIdResult)) {
          return {
            resolvedPath: resolveIdResult?.id,
            query: customParseQueryString(resolveIdResult!.id),
            sideEffects: false,
            external: resolveIdResult?.external,
            meta: {},
          }
        }
        return null
      },
    } as unknown as JsPlugin['resolve']
  }

  if (plugin.load) {
    const _load = plugin.load
    farmPlugin.load = {
      filters: {
        resolvedPaths: ['.*'],
      },
      async executor(
        id: PluginLoadHookParam,
        context,
      ): Promise<PluginLoadHookResult | null> {
        if (plugin.loadInclude && !plugin.loadInclude(id.resolvedPath))
          return null
        const loader = guessIdLoader(id.resolvedPath)
        const shouldLoadInclude
          = plugin.loadInclude && plugin.loadInclude(id.resolvedPath)
        const farmContext = createFarmContext(context!, id.resolvedPath)
        const unpluginContext: UnpluginContext = {
          error: error =>
            context!.error(
              typeof error === 'string' ? new Error(error) : error,
            ),
          warn: error =>
            context!.warn(typeof error === 'string' ? new Error(error) : error),
        }

        const content: TransformResult = await _load.call(
          Object.assign(unpluginContext, farmContext),
          id.resolvedPath,
        )
        const loadFarmResult: PluginLoadHookResult = {
          // TODO maybe sourcemap resolve
          content: getContentValue(content),
          moduleType: loader,
        }
        if (shouldLoadInclude)
          return loadFarmResult

        return loadFarmResult
      },
    } as JsPlugin['load']
  }

  if (plugin.transform) {
    const _transform = plugin.transform
    farmPlugin.transform = {
      filters: { resolvedPaths: ['.*'], moduleTypes: ['.*'] },
      async executor(
        params: PluginTransformHookParam,
        context: CompilationContext,
      ) {
        if (params.query.length)
          transformQuery(params)

        if (
          plugin.transformInclude
          && !plugin.transformInclude(params.resolvedPath)
        )
          return null

        const loader = params.moduleType ?? guessIdLoader(params.resolvedPath)
        const shouldTransformInclude
          = plugin.transformInclude
          && plugin.transformInclude(params.resolvedPath)
        const farmContext = createFarmContext(context, params.resolvedPath)
        const unpluginContext: UnpluginContext = {
          error: error =>
            context.error(typeof error === 'string' ? new Error(error) : error),
          warn: error =>
            context.warn(typeof error === 'string' ? new Error(error) : error),
        }

        const resource: TransformResult = await _transform.call(
          Object.assign(unpluginContext, farmContext),
          params.content,
          params.resolvedPath,
        )

        if (resource && typeof resource !== 'string') {
          const transformFarmResult: PluginTransformHookResult = {
            content: getContentValue(resource),
            moduleType: loader,
            sourceMap: JSON.stringify(resource.map),
          }
          if (shouldTransformInclude)
            return transformFarmResult

          return transformFarmResult
        }
      },
    } as JsPlugin['transform']
  }

  if (plugin.watchChange) {
    const _watchChange = plugin.watchChange
    farmPlugin.updateModules = {
      async executor(param, context) {
        // To be compatible with unplugin, we ensure that only one file is changed at a time.
        const updatePathContent = param.paths[0]
        const ModifiedPath = updatePathContent[0]
        const eventChange = convertWatchEventChange(
          updatePathContent[1] as WatchChangeEvents,
        )
        await _watchChange.call(createFarmContext(context!), ModifiedPath, {
          event: eventChange,
        })
      },
    } as JsPlugin['updateModules']
  }

  if (plugin.buildEnd) {
    const _buildEnd = plugin.buildEnd
    farmPlugin.buildEnd = {
      async executor(_, context) {
        await _buildEnd.call(createFarmContext(context!))
      },
    } as JsPlugin['buildEnd']
  }

  if (plugin.writeBundle) {
    const _writeBundle = plugin.writeBundle
    farmPlugin.finish = {
      async executor() {
        await _writeBundle()
      },
    } as JsPlugin['finish']
  }

  return farmPlugin
}
