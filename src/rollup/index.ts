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
    const plugins = rawPlugins.map(plugin => toRollupPlugin(plugin, 'rollup', meta))
    return plugins.length === 1 ? plugins[0] : plugins
  }) as UnpluginInstance<UserOptions, Nested>['rollup']
}

export function toRollupPlugin(
  plugin: UnpluginOptions,
  key: 'rollup' | 'rolldown' | 'vite' | 'unloader',
  meta: UnpluginContextMeta,
): RollupPlugin {
  const nativeFilter = key === 'rolldown'

  if (
    plugin.resolveId
    && (!nativeFilter && typeof plugin.resolveId === 'object' && plugin.resolveId.filter)
  ) {
    const resolveIdHook = plugin.resolveId
    const { handler, filter } = normalizeObjectHook('load', resolveIdHook)

    replaceHookHandler('resolveId', resolveIdHook, function (...args) {
      const [id] = args
      const supportFilter = supportNativeFilter(this, key)
      if (!supportFilter && !filter(id))
        return

      return handler.apply(this, args)
    })
  }

  if (plugin.load && (
    plugin.loadInclude
    || (!nativeFilter && typeof plugin.load === 'object' && plugin.load.filter))
  ) {
    const loadHook = plugin.load
    const { handler, filter } = normalizeObjectHook('load', loadHook)

    replaceHookHandler('load', loadHook, function (...args) {
      const [id] = args
      if (plugin.loadInclude && !plugin.loadInclude(id))
        return

      const supportFilter = supportNativeFilter(this, key)
      if (!supportFilter && !filter(id))
        return

      return handler.apply(this, args)
    })
  }

  if (plugin.transform && (
    plugin.transformInclude
    || (!nativeFilter && typeof plugin.transform === 'object' && plugin.transform.filter))
  ) {
    const transformHook = plugin.transform
    const { handler, filter } = normalizeObjectHook('transform', transformHook)

    replaceHookHandler('transform', transformHook, function (...args) {
      const [code, id] = args
      if (plugin.transformInclude && !plugin.transformInclude(id))
        return

      const supportFilter = supportNativeFilter(this, key)
      if (!supportFilter && !filter(id, code))
        return

      return handler.apply(this, args)
    })
  }

  if (plugin[key])
    Object.assign(plugin, plugin[key])

  const buildStartHook = plugin.buildStart as Hook<HookFnMap['buildStart'], any> | undefined
  const buildStartHandler = typeof buildStartHook === 'object'
    ? buildStartHook?.handler
    : buildStartHook

  switch (key) {
    case 'vite':
      replaceHookHandler('buildStart', buildStartHook, function (...args) {
        meta.frameworkVersion = (this as any)?.meta?.viteVersion
        return buildStartHandler?.apply(this, args)
      })
      break
    case 'rollup':
      replaceHookHandler('buildStart', buildStartHook, function (...args) {
        meta.frameworkVersion = (this as any)?.meta?.rollupVersion
        return buildStartHandler?.apply(this, args)
      })
      break
    case 'rolldown':
      replaceHookHandler('buildStart', buildStartHook, function (...args) {
        meta.frameworkVersion = (this as any)?.meta?.rolldownVersion
        return buildStartHandler?.apply(this, args)
      })
      break
    case 'unloader':
      replaceHookHandler('buildStart', buildStartHook, function (...args) {
        meta.frameworkVersion = (this as any)?.meta?.unloaderVersion
        return buildStartHandler?.apply(this, args)
      })
      break
  }

  return plugin as RollupPlugin

  function replaceHookHandler<K extends keyof HookFnMap>(
    name: K,
    hook: Hook<HookFnMap[K], any> | undefined,
    handler: HookFnMap[K],
  ) {
    if (typeof hook === 'object') {
      hook.handler = handler
    }
    else {
      plugin[name] = handler as any
    }
  }
}

function supportNativeFilter(context: any, framework: 'rollup' | 'rolldown' | 'vite' | 'unloader') {
  if (framework === 'vite')
    return !!context?.meta?.viteVersion // since Vite v7

  if (framework === 'rolldown')
    return true // always supported

  const rollupVersion: string | undefined = context?.meta?.rollupVersion
  if (!rollupVersion)
    return false

  const [major, minor] = rollupVersion.split('.')
  // https://github.com/rollup/rollup/pull/5909#issuecomment-2798739729
  return (Number(major) > 4 || (Number(major) === 4 && Number(minor) >= 40))
}
