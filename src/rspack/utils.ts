import fs from 'fs'
import { basename, dirname, resolve } from 'path'
import { Compiler } from '@rspack/core'
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

export class FakeVirtualModulesPlugin {
  name = 'FakeVirtualModulesPlugin'
  constructor(private plugin: ResolvedUnpluginOptions) {}

  apply(compiler: Compiler) {
    const dir = this.plugin.__virtualModulePrefix
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    compiler.hooks.shutdown.tap(this.name, () => {
      if (fs.existsSync(dir)) {
        fs.rmdirSync(dir, { recursive: true })
      }
    })
  }

  async writeModule(file: string) {
    const path = encodeVirtualModuleId(file, this.plugin)
    await fs.promises.writeFile(path, '')
    return path
  }
}
