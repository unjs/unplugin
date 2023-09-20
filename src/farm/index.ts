import type { PluginLoadHookParam } from '@farmfe/core/binding'
import type {
  RollupPlugin,
  UnpluginContextMeta,
  UnpluginFactory,
  UnpluginInstance,
  UnpluginOptions,
} from '../types'
import { toArray } from '../utils'
import { guessIdLoader, transformQuery } from './utils'

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
  if (plugin.load) {
    const _load: any = plugin.load
    plugin.load = {
      filters: {
        resolvedPaths: ['.*'],
      },
      executor(id: PluginLoadHookParam) {
        if (plugin.loadInclude && !plugin.loadInclude(id.resolvedPath))
          return null
        const loader = guessIdLoader(id.resolvedPath)
        const shouldLoadInclude
          = plugin.loadInclude && plugin.loadInclude(id.resolvedPath)
        const content = _load(id.resolvedPath)

        if (shouldLoadInclude) {
          return {
            content,
            moduleType: loader,
          }
        }

        return {
          content,
          moduleType: loader,
        }
      },
    } as any
  }

  if (plugin.transform) {
    const _transform: any = plugin.transform
    plugin.transform = {
      filters: { resolvedPaths: ['.*'] },
      executor(params: any) {
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
        const resource: any = _transform(params.content, params.resolvedPath)
        if (shouldTransformInclude) {
          return {
            content: resource.code,
            moduleType: loader,
            sourceMap: JSON.stringify(resource.map),
          }
        }
        return {
          content: resource.code,
          moduleType: loader,
          sourceMap: JSON.stringify(resource.map),
        }
      },
    } as any
  }

  return plugin
}

/**
 * v1.0.0 beta
 * 1. 增量构建
 * 2. 重构 resolver
 * 3. 接入一些 js 生态 (unplugin)
 * 4. 重构 node 规范化基础配置流程 不重要！
 * 5. 接 fervid 的 vue compiler 不重要！
 * 6. 用户DX 修复一些体验 bug e.g: 热更新报错白屏
 */
