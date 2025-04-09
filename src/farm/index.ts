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
  TransformResult,
  UnpluginContextMeta,
  UnpluginFactory,
  UnpluginInstance,
  UnpluginOptions,
} from '../types'
import type { JsPluginExtended, WatchChangeEvents } from './utils'

import path from 'node:path'

import { normalizeObjectHook } from '../utils/filter'
import { toArray } from '../utils/general'
import { createFarmContext, unpluginContext } from './context'
import {
  appendQuery,
  convertEnforceToPriority,
  convertWatchEventChange,
  customParseQueryString,
  decodeStr,
  encodeStr,
  formatTransformModuleType,
  getContentValue,
  isObject,
  isStartsWithSlash,
  isString,
  removeQuery,
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
      filters: { sources: filters.length ? filters : ['.*'], importers: ['.*'] },
      async executor(params: PluginResolveHookParam, context: CompilationContext) {
        const resolvedIdPath = path.resolve(
          params.importer ?? '',
        )
        const id = decodeStr(params.source)

        const { handler, filter } = normalizeObjectHook('resolveId', _resolveId)
        if (!filter(id))
          return null

        let isEntry = false
        if (isObject(params.kind) && 'entry' in params.kind) {
          const kindWithEntry = params.kind as { entry: string }
          isEntry = kindWithEntry.entry === 'index'
        }
        const farmContext = createFarmContext(context!, resolvedIdPath)
        const resolveIdResult = await handler.call(
          Object.assign(unpluginContext(context), farmContext),
          id,
          resolvedIdPath ?? null,
          { isEntry },
        )

        if (isString(resolveIdResult)) {
          return {
            resolvedPath: removeQuery(encodeStr(resolveIdResult)),
            query: customParseQueryString(resolveIdResult),
            sideEffects: true,
            external: false,
            meta: {},
          }
        }
        if (isObject(resolveIdResult)) {
          return {
            resolvedPath: removeQuery(encodeStr(resolveIdResult?.id)),
            query: customParseQueryString(resolveIdResult?.id),
            sideEffects: false,
            external: Boolean(resolveIdResult?.external),
            meta: {},
          }
        }

        if (!isStartsWithSlash(params.source))
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
        const resolvedPath = decodeStr(params.resolvedPath)
        const id = appendQuery(resolvedPath, params.query)
        const loader = formatTransformModuleType(id)

        if (plugin.loadInclude && !plugin.loadInclude?.(id))
          return null
        const { handler, filter } = normalizeObjectHook('load', _load)
        if (!filter(id))
          return null

        const farmContext = createFarmContext(context!, id)
        const content: TransformResult = await handler.call(
          Object.assign(unpluginContext(context!), farmContext),
          id,
        )

        const loadFarmResult: PluginLoadHookResult = {
          content: getContentValue(content),
          moduleType: loader,
        }

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
        const resolvedPath = decodeStr(params.resolvedPath)
        const id = appendQuery(resolvedPath, params.query)
        const loader = formatTransformModuleType(id)

        if (plugin.transformInclude && !plugin.transformInclude(id))
          return null

        const { handler, filter } = normalizeObjectHook('transform', _transform)
        if (!filter(id, params.content))
          return null

        const farmContext = createFarmContext(context, id)
        const resource: TransformResult = await handler.call(
          Object.assign(unpluginContext(context), farmContext),
          params.content,
          id,
        )
        if (resource && typeof resource !== 'string') {
          const transformFarmResult: PluginTransformHookResult = {
            content: getContentValue(resource),
            moduleType: loader,
            sourceMap: typeof resource.map === 'object' && resource.map !== null
              ? JSON.stringify(resource.map)
              : undefined,
          }

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
