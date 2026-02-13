import type { Hook, HookFnMap, RollupPlugin, UnpluginContextMeta, UnpluginFactory, UnpluginInstance, UnpluginOptions } from '../types'
import { version as unpluginVersion } from '../../package.json'
import { normalizeObjectHook } from '../utils/filter'
import { toArray } from '../utils/general'

export function getRollupPlugin<UserOptions = Record<string, never>, Nested extends boolean = boolean>(
  factory: UnpluginFactory<UserOptions, Nested>,
) {
  return ((userOptions?: UserOptions) => {
    const meta: UnpluginContextMeta = {
      framework: 'rollup',
      versions: { unplugin: unpluginVersion }, // Will be populated in buildStart hook
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

  replaceHookHandler('buildStart', buildStartHook, function (...args) {
    const versions: Partial<Record<string, string>> = { unplugin: unpluginVersion }

    // Vite's own version
    const viteVersion = (this as any)?.meta?.viteVersion
    if (viteVersion)
      versions.vite = viteVersion

    // Underlying bundler version (Rollup or Rolldown)
    const rollupVersion = (this as any)?.meta?.rollupVersion
    if (rollupVersion)
      versions.rollup = rollupVersion

    const rolldownVersion = (this as any)?.meta?.rolldownVersion
    if (rolldownVersion)
      versions.rolldown = rolldownVersion

    const unloaderVersion = (this as any)?.meta?.unloaderVersion
    if (unloaderVersion)
      versions.unloader = unloaderVersion

    meta.versions = versions
    return buildStartHandler?.apply(this, args)
  })

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
