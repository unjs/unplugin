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
    const plugins = rawPlugins.map(plugin => toFarmPlugin(plugin))
    return plugins.length === 1 ? plugins[0] : plugins
  }) as UnpluginInstance<UserOptions, Nested>['rollup']
}

export function toFarmPlugin(plugin: UnpluginOptions): JsPlugin {
  const farmPlugin: JsPlugin = {
    name: plugin.name,
    priority: convertEnforceToPriority(plugin.enforce),
  }

  if (plugin.buildStart) {
    const _buildStart = plugin.buildStart
    farmPlugin.buildStart = {
      async executor() {
        await _buildStart.call(this)
      },
    }
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
        if (typeof params.kind === 'object' && params.kind !== null)
          isEntry = params.kind.entry === 'index'

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
    }
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
          = _load.call(this, id.resolvedPath)
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
    } as any
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
          if (shouldTransformInclude) {
            return {
              content: resource.code,
              moduleType: loader,
              sourceMap: JSON.stringify(resource.map),
            } as PluginTransformHookResult
          }
          return {
            content: resource.code,
            moduleType: loader,
            sourceMap: JSON.stringify(resource.map),
          } as PluginTransformHookResult
        }
      },
    } as any
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
        _watchChange.call(this, ModifiedPath, { event: eventChange })
      },
    }
  }

  if (plugin.buildEnd) {
    const _buildEnd = plugin.buildEnd
    farmPlugin.buildEnd = {
      executor() {
        _buildEnd.call(this)
      },
    }
  }

  if (plugin.writeBundle) {
    const _writeBundle = plugin.writeBundle
    farmPlugin.finish = {
      executor() {
        _writeBundle()
      },
    }
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
