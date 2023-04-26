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
    /** @experimental do not use it in production */
    get rspack() {
      return getRspackPlugin(factory)
    },
    get raw() {
      return factory
    },
  }
}

export function creteEsbuildPlugin<UserOptions, Nested extends boolean = boolean>(
  factory: UnpluginFactory<UserOptions, Nested>,
) {
  return getEsbuildPlugin(factory)
}

export function creteRollupPlugin<UserOptions, Nested extends boolean = boolean>(
  factory: UnpluginFactory<UserOptions, Nested>,
) {
  return getRollupPlugin(factory)
}

export function creteVitePlugin<UserOptions, Nested extends boolean = boolean>(
  factory: UnpluginFactory<UserOptions, Nested>,
) {
  return getVitePlugin(factory)
}

export function creteWebpackPlugin<UserOptions, Nested extends boolean = boolean>(
  factory: UnpluginFactory<UserOptions, Nested>,
) {
  return getWebpackPlugin(factory)
}

export function creteRspackPlugin<UserOptions, Nested extends boolean = boolean>(
  factory: UnpluginFactory<UserOptions, Nested>,
) {
  return getRspackPlugin(factory)
}
