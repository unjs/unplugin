import { getEsbuildPlugin } from './esbuild'
import { getRollupPlugin } from './rollup'
import { getRspackPlugin } from './rspack'
import type { UnpluginFactory, UnpluginInstance } from './types'
import { getVitePlugin } from './vite'
import { getWebpackPlugin } from './webpack'

export function createUnplugin<UserOptions, Nested extends boolean = boolean>(
  factory: UnpluginFactory<UserOptions, Nested>,
): UnpluginInstance<UserOptions, Nested> {
  return {
    get esbuild() {
      return getEsbuildPlugin(factory)
    },
    get rollup() {
      return getRollupPlugin(factory)
    },
    get vite() {
      return getVitePlugin(factory)
    },
    get webpack() {
      return getWebpackPlugin(factory)
    },
    get rspack() {
      return getRspackPlugin(factory)
    },
    get raw() {
      return factory
    },
  }
}
