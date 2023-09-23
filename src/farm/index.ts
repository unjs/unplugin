import fs from 'fs'
import path from 'path'
import type {
  PluginLoadHookParam,
  PluginLoadHookResult,
  PluginResolveHookParam,
  PluginTransformHookParam,
  PluginTransformHookResult,
} from '@farmfe/core/binding'
import type { JsPlugin } from '@farmfe/core'
import type {
  TransformResult,
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
  guessIdLoader,
  transformQuery,
} from './utils'

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
  }) as UnpluginInstance<UserOptions, Nested>['rollup']
}

export function toFarmPlugin(plugin: UnpluginOptions): JsPlugin {
  const farmPlugin: JsPlugin = {
    name: plugin.name,
    priority: convertEnforceToPriority(plugin.enforce),
  }

  if (plugin.farm?.config)
    farmPlugin.config = plugin.farm.config

  if (plugin.farm?.configDevServer)
    farmPlugin.configDevServer = plugin.farm.configDevServer

  if (plugin.farm?.updateModules)
    farmPlugin.updateModules = plugin.farm.updateModules

  if (plugin.buildStart) {
    const _buildStart = plugin.buildStart
    farmPlugin.buildStart = {
      async executor(_, hook) {
        await _buildStart.call(hook)
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
        if (typeof params.kind === 'object' && 'entry' in params.kind) {
          const kindWithEntry = params.kind as { entry: string }
          isEntry = kindWithEntry.entry === 'index'
        }
        const resolvedPath = await _resolveId(
          params.source,
          resolvedIdPath ?? null,
          { isEntry },
        )
        if (resolvedPath && typeof resolvedPath === 'string') {
          return {
            resolvedPath,
            query: [],
            sideEffects: false,
            external: false,
            meta: {},
          }
        }
        return null
      },
    } as JsPlugin['resolve']
  }

  if (plugin.load) {
    const _load = plugin.load
    farmPlugin.load = {
      filters: {
        resolvedPaths: ['.*'],
      },
      async executor(
        id: PluginLoadHookParam,
      ): Promise<PluginLoadHookResult | null> {
        if (plugin.loadInclude && !plugin.loadInclude(id.resolvedPath))
          return null
        const loader = guessIdLoader(id.resolvedPath)
        const shouldLoadInclude
          = plugin.loadInclude && plugin.loadInclude(id.resolvedPath)
        const content
          = (await _load.call(this, id.resolvedPath))
          ?? (await fs.promises.readFile(id.resolvedPath, 'utf8'))

        if (shouldLoadInclude) {
          return {
            content,
            moduleType: loader,
          } as PluginLoadHookResult
        }

        return {
          content,
          moduleType: loader,
        } as PluginLoadHookResult
      },
    } as JsPlugin['load']
  }

  if (plugin.transform) {
    const _transform = plugin.transform
    farmPlugin.transform = {
      filters: { resolvedPaths: ['.*'] },
      async executor(params: PluginTransformHookParam) {
        if (params.query.length)
          transformQuery(params)

        if (
          plugin.transformInclude
          && !plugin.transformInclude(params.resolvedPath)
        )
          return null

        const loader = guessIdLoader(params.resolvedPath)
        const shouldTransformInclude
          = plugin.transformInclude
          && plugin.transformInclude(params.resolvedPath)
        const resource: TransformResult = await _transform.call(
          this,
          params.content,
          params.resolvedPath,
        )

        if (resource && typeof resource !== 'string') {
          const transformFarmResult: PluginTransformHookResult = {
            content: resource.code,
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
      async executor(param) {
        // To be compatible with unplugin, we ensure that only one file is changed at a time.
        const updatePathContent = param.paths[0]
        const ModifiedPath = updatePathContent[0]
        const eventChange = convertWatchEventChange(
          updatePathContent[1] as WatchChangeEvents,
        )
        await _watchChange.call(this, ModifiedPath, { event: eventChange })
      },
    } as JsPlugin['updateModules']
  }

  if (plugin.buildEnd) {
    const _buildEnd = plugin.buildEnd
    farmPlugin.buildEnd = {
      async executor(_, context) {
        await _buildEnd.call(context)
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

/**
 * Degree of completion
 * enforce ✅
 * buildStart ✅
 * resolveId ✅
 * loadInclude ✅
 * load ✅
 * transformInclude ✅
 * transform ✅
 * watchChange ✅
 * buildEnd ✅
 * writeBundle ✅
 */
