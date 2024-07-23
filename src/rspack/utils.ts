import type { ResolvedUnpluginOptions } from '../src/types'

export function encodeVirtualModuleId(id: string, plugin: ResolvedUnpluginOptions): string {
  return plugin.__virtualModulePrefix + encodeURIComponent(id)
}

export function decodeVirtualModuleId(encoded: string, plugin: ResolvedUnpluginOptions): string {
  return decodeURIComponent(encoded.slice(plugin.__virtualModulePrefix.length))
}

export function isVirtualModuleId(encoded: string, plugin: ResolvedUnpluginOptions): boolean {
  return encoded.startsWith(plugin.__virtualModulePrefix)
}
