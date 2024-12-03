import type { Compiler } from '@rspack/core'
import type { ResolvedUnpluginOptions } from '../types'
import fs from 'node:fs'
import { basename, dirname, resolve } from 'node:path'

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

  apply(compiler: Compiler): void {
    const dir = this.plugin.__virtualModulePrefix
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    compiler.hooks.shutdown.tap(this.name, () => {
      fs.rmSync(dir, { recursive: true, force: true })
    })
  }

  async writeModule(file: string): Promise<string> {
    const path = encodeVirtualModuleId(file, this.plugin)
    await fs.promises.writeFile(path, '')
    return path
  }
}
