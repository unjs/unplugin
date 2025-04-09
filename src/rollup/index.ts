import type { Hook, HookFnMap, RollupPlugin, UnpluginContextMeta, UnpluginFactory, UnpluginInstance, UnpluginOptions } from '../types'
import { normalizeObjectHook } from '../utils/filter'
import { toArray } from '../utils/general'

export function getRollupPlugin<UserOptions = Record<string, never>, Nested extends boolean = boolean>(
  factory: UnpluginFactory<UserOptions, Nested>,
) {
  return ((userOptions?: UserOptions) => {
    const meta: UnpluginContextMeta = {
      framework: 'rollup',
    }
    const rawPlugins = toArray(factory(userOptions!, meta))
    const plugins = rawPlugins.map(plugin => toRollupPlugin(plugin, 'rollup'))
    return plugins.length === 1 ? plugins[0] : plugins
  }) as UnpluginInstance<UserOptions, Nested>['rollup']
}

export function toRollupPlugin(plugin: UnpluginOptions, key: 'rollup' | 'rolldown' | 'vite' | 'unloader'): RollupPlugin {
  const nativeFilter = key === 'rolldown'

  if (
    plugin.resolveId
    && (!nativeFilter && typeof plugin.resolveId === 'object' && plugin.resolveId.filter)
  ) {
    const resolveIdHook = plugin.resolveId
    const { handler, filter } = normalizeObjectHook('load', resolveIdHook)

    replaceHookHandler('resolveId', resolveIdHook, function (id, ...args) {
      const supportFilter = supportNativeFilter((this as any).meta)
      if (!supportFilter && !filter(id))
        return

      return handler.call(this, id, ...args)
    })
  }

  if (plugin.load && (
    plugin.loadInclude
    || (!nativeFilter && typeof plugin.load === 'object' && plugin.load.filter))
  ) {
    const loadHook = plugin.load
    const { handler, filter } = normalizeObjectHook('load', loadHook)

    replaceHookHandler('load', loadHook, function (id, ...args) {
      if (plugin.loadInclude && !plugin.loadInclude(id))
        return

      const supportFilter = supportNativeFilter((this as any).meta)
      if (!supportFilter && !filter(id))
        return

      return handler.call(this, id, ...args)
    })
  }

  if (plugin.transform && (
    plugin.transformInclude
    || (!nativeFilter && typeof plugin.transform === 'object' && plugin.transform.filter))
  ) {
    const transformHook = plugin.transform
    const { handler, filter } = normalizeObjectHook('transform', transformHook)

    replaceHookHandler('transform', transformHook, function (code, id, ...args) {
      if (plugin.transformInclude && !plugin.transformInclude(id))
        return

      const supportFilter = supportNativeFilter((this as any).meta)
      if (!supportFilter && !filter(id, code))
        return

      return handler.call(this, code, id, ...args)
    })
  }

  if (plugin[key])
    Object.assign(plugin, plugin[key])

  return plugin as RollupPlugin

  function replaceHookHandler<
    T extends 'resolveId' | 'load' | 'transform',
  >(
    name: T,
    hook: Hook<HookFnMap[T], any>,
    handler: HookFnMap[T],
  ) {
    if (typeof hook === 'function') {
      plugin[name] = handler as any
    }
    else {
      hook.handler = handler
    }
  }
}

function supportNativeFilter(meta: any) {
  const rollupVersion: string | undefined = meta?.rollupVersion
  if (!rollupVersion)
    return false

  const [major, minor] = rollupVersion.split('.')
  return (Number(major) > 4 || (Number(major) === 4 && Number(minor) >= 38))
}
