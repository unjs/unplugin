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
  static counters: Map<string, number> = new Map<string, number>()

  static {
    ['SIGINT', 'SIGTERM', 'SIGQUIT', 'exit'].forEach((event) => {
      process.once(event, () => {
        this.counters.forEach((_, dir) => {
          fs.rmSync(dir, { recursive: true, force: true })
        })
      })
    })
  }

  constructor(private plugin: ResolvedUnpluginOptions) {}

  apply(compiler: Compiler): void {
    const dir = this.plugin.__virtualModulePrefix
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const counter = FakeVirtualModulesPlugin.counters.get(dir) ?? 0
    FakeVirtualModulesPlugin.counters.set(dir, counter + 1)

    compiler.hooks.shutdown.tap(this.name, () => {
      const counter = (FakeVirtualModulesPlugin.counters.get(dir) ?? 1) - 1
      if (counter === 0) {
        FakeVirtualModulesPlugin.counters.delete(dir)
        fs.rmSync(dir, { recursive: true, force: true })
      }
      else {
        FakeVirtualModulesPlugin.counters.set(dir, counter)
      }
    })
  }

  async writeModule(file: string): Promise<string> {
    const path = encodeVirtualModuleId(file, this.plugin)
    await fs.promises.writeFile(path, '')
    return path
  }
}
