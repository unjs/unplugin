import fs from 'fs'
import { basename, dirname, resolve } from 'path'
import type { ResolvedUnpluginOptions } from '../types'

export function encodeVirtualModuleId(id: string, plugin: ResolvedUnpluginOptions): string {
  return resolve(plugin.__virtualModulePrefix, encodeURIComponent(id))
}

export function decodeVirtualModuleId(encoded: string, _plugin: ResolvedUnpluginOptions): string {
  return decodeURIComponent(basename(encoded))
}

export function isVirtualModuleId(encoded: string, plugin: ResolvedUnpluginOptions): boolean {
  return dirname(encoded) === plugin.__virtualModulePrefix
}

export class FakeVirtualModules {
  constructor(private plugin: ResolvedUnpluginOptions) {
    const dir = this.plugin.__virtualModulePrefix
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }
    process.on('exit', async () => {
      fs.rmdirSync(dir, { recursive: true })
    })
  }

  async writeModule(file: string) {
    const path = encodeVirtualModuleId(file, this.plugin)
    await fs.promises.writeFile(path, '')
    return path
  }
}
