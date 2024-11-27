import type {
  CompilationContext,
  JsPlugin,
  PluginLoadHookParam,
  PluginLoadHookResult,
  PluginResolveHookParam,
  PluginTransformHookParam,
  PluginTransformHookResult,
} from '@farmfe/core'
import type {
  JsPluginExtended,
  TransformResult,
  UnpluginContextMeta,
  UnpluginFactory,
  UnpluginInstance,
  UnpluginOptions,
} from '../types'
import type { WatchChangeEvents } from './utils'
import { existsSync } from 'fs'
import path from 'path'
import { toArray } from '../utils'

import { createFarmContext, unpluginContext } from './context'
import {
  appendQuery,
  convertEnforceToPriority,
  convertWatchEventChange,
  customParseQueryString,
  decodeStr,
  encodeStr,
  getContentValue,
  guessIdLoader,
  isObject,
  isStartsWithSlash,
  isString,
  normalizeAdapterVirtualModule,
  removeQuery,
  transformQuery,
} from './utils'

export function getFarmPlugin<
  UserOptions = Record<string, never>,
  Nested extends boolean = boolean,
>(factory: UnpluginFactory<UserOptions, Nested>) {
  return ((userOptions?: UserOptions) => {
    const meta: UnpluginContextMeta = {
      framework: 'farm',
    }
    const rawPlugins = toArray(factory(userOptions!, meta))

    const plugins = rawPlugins.map((rawPlugin) => {
      const plugin = toFarmPlugin(rawPlugin, userOptions as Record<string, any>) as JsPlugin
      if (rawPlugin.farm)
        Object.assign(plugin, rawPlugin.farm)

      return plugin
    })

    return plugins.length === 1 ? plugins[0] : plugins
  }) as UnpluginInstance<UserOptions>['farm']
}

export const resolveIdFilters = {
  sources: ['!node_modules'],
  importers: ['!node_modules'],
}

export function toFarmPlugin(plugin: UnpluginOptions, options?: Record<string, any> | undefined): JsPlugin {
  const farmPlugin: JsPlugin = {
    name: plugin.name,
    priority: convertEnforceToPriority(plugin.enforce),
  }

  if (plugin.farm) {
    Object.keys(plugin.farm).forEach((key) => {
      const value = (plugin.farm as JsPluginExtended)[key]
      if (value)
        Reflect.set(farmPlugin, key, value)
    })
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
    let filters = []
    if (options)
      filters = options?.filters ?? []

    farmPlugin.resolve = {
      filters: { sources: ['.*', ...filters], importers: ['.*'] },
      async executor(params: PluginResolveHookParam, context: CompilationContext) {
        const resolvedIdPath = path.resolve(
          process.cwd(),
          params.importer ?? '',
        )

        let isEntry = false
        if (isObject(params.kind) && 'entry' in params.kind) {
          const kindWithEntry = params.kind as { entry: string }
          isEntry = kindWithEntry.entry === 'index'
        }
        const farmContext = createFarmContext(context!, resolvedIdPath)
        let resolveIdResult = await _resolveId.call(
          Object.assign(unpluginContext(context), farmContext),
          decodeStr(params.source),
          resolvedIdPath ?? null,
          { isEntry },
        )

        if (isString(resolveIdResult)) {
          resolveIdResult = normalizeAdapterVirtualModule(resolveIdResult)
          return {
            resolvedPath: removeQuery(encodeStr(resolveIdResult)),
            query: customParseQueryString(resolveIdResult),
            sideEffects: true,
            external: false,
            meta: {},
          }
        }
        if (isObject(resolveIdResult)) {
          const resolveId = normalizeAdapterVirtualModule(
            resolveIdResult?.id,
          )
          return {
            resolvedPath: removeQuery(encodeStr(resolveId)),
            query: customParseQueryString(resolveId),
            sideEffects: false,
            external: Boolean(resolveIdResult?.external),
            meta: {},
          }
        }

        const rootAbsolutePath = path.resolve(
          params.source,
        )

        if (
          isStartsWithSlash(params.source)
          && existsSync(rootAbsolutePath)
        ) {
          return {
            resolvedPath: removeQuery(encodeStr(rootAbsolutePath)),
            query: customParseQueryString(rootAbsolutePath),
            sideEffects: false,
            external: false,
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
        params: PluginLoadHookParam,
        context,
      ): Promise<PluginLoadHookResult | null> {
        if (plugin.loadInclude && !plugin.loadInclude(params.resolvedPath))
          return null
        const loader = guessIdLoader(params.resolvedPath)
        const shouldLoadInclude
          = plugin.loadInclude && plugin.loadInclude(params.resolvedPath)
        const farmContext = createFarmContext(context!, params.resolvedPath)
        const resolvedPath = decodeStr(params.resolvedPath)
        const id = appendQuery(resolvedPath, params.query)

        const content: TransformResult = await _load.call(
          Object.assign(unpluginContext(context!), farmContext),
          id,
        )
        const loadFarmResult: PluginLoadHookResult = {
          content: getContentValue(content),
          moduleType: loader,
        }
        if (shouldLoadInclude)
          return loadFarmResult

        return null
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
        ) {
          return null
        }

        const loader = params.moduleType ?? guessIdLoader(params.resolvedPath)
        const shouldTransformInclude
          = plugin.transformInclude
          && plugin.transformInclude(params.resolvedPath)
        const farmContext = createFarmContext(context, params.resolvedPath)
        const resolvedPath = decodeStr(params.resolvedPath)
        const id = appendQuery(resolvedPath, params.query)
        const resource: TransformResult = await _transform.call(
          Object.assign(unpluginContext(context), farmContext),
          params.content,
          id,
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
