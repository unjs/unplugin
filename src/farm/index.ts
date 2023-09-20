import type {
  RollupPlugin,
  UnpluginContextMeta,
  UnpluginFactory,
  UnpluginInstance,
  UnpluginOptions,
} from '../types'
import { toArray } from '../utils'
import { guessIdLoader } from './utils'

export function getFarmPlugin<
  UserOptions = Record<string, never>,
  Nested extends boolean = boolean,
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

export function toFarmPlugin(plugin: UnpluginOptions): RollupPlugin {
  if (plugin.transform && plugin.transformInclude) {
    // const _transform = plugin.transform
    // plugin.transform = function (code, id) {
    //   if (plugin.transformInclude && !plugin.transformInclude(id))
    //     return null

    //   return _transform.call(this, code, id)
    // }
    // TODO: resolvePath
    const _transform = plugin.transform
    plugin.transform = {
      filters: { resolvedPaths: ['.*'] },
      executor(params) {
        const loader = guessIdLoader(params.resolvedPath)
        if (
          plugin.transformInclude
          && !plugin.transformInclude(params.resolvedPath)
        )
          return null
        if (plugin.transformInclude(params.resolvedPath)) {
          const resource = _transform(params.content, params.resolvedPath)

          return {
            content: resource.code,
            moduleType: loader,
            sourceMap: JSON.stringify(resource.map),
          }
        }
      },
    }
  }

  if (plugin.load && plugin.loadInclude) {
    const _load = plugin.load
    // plugin.load = function (id) {
    //   if (plugin.loadInclude && !plugin.loadInclude(id))
    //     return null

    //   return _load.call(this, id)
    // }
    plugin.load = {
      filters: {
        resolvedPaths: ['.*'],
      },
      executor(id) {
        const loader = guessIdLoader(id.resolvedPath)
        if (plugin.loadInclude(id.resolvedPath)) {
          const content = _load(id.resolvedPath)

          return {
            content,
            moduleType: loader,
          }
        }
      },
    }
  }
  // delete plugin.transformInclude
  // delete plugin.loadInclude

  // if (plugin.rollup && containRollupOptions)
  //   Object.assign(plugin, plugin.rollup)

  return plugin
}

/**
 * v1.0.0 beta
 * 1. 增量构建
 * 2. 重构 resolver
 * 3. 接入一些 js 生态 (unplugin)
 * 4. 重构 node 流程 规范化
 * 5. 感觉还可以接一下 fervid 的 vue compiler
 */
