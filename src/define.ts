import { getEsbuildPlugin } from './esbuild'
import { getRolldownPlugin } from './rolldown'
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
    get rolldown() {
      return getRolldownPlugin(factory)
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

export function createEsbuildPlugin<UserOptions, Nested extends boolean = boolean>(
  factory: UnpluginFactory<UserOptions, Nested>,
) {
  return getEsbuildPlugin(factory)
}

export function createRollupPlugin<UserOptions, Nested extends boolean = boolean>(
  factory: UnpluginFactory<UserOptions, Nested>,
) {
  return getRollupPlugin(factory)
}

export function createVitePlugin<UserOptions, Nested extends boolean = boolean>(
  factory: UnpluginFactory<UserOptions, Nested>,
) {
  return getVitePlugin(factory)
}

export function createRolldownPlugin<UserOptions, Nested extends boolean = boolean>(
  factory: UnpluginFactory<UserOptions, Nested>,
) {
  return getRolldownPlugin(factory)
}

export function createWebpackPlugin<UserOptions, Nested extends boolean = boolean>(
  factory: UnpluginFactory<UserOptions, Nested>,
) {
  return getWebpackPlugin(factory)
}

export function createRspackPlugin<UserOptions, Nested extends boolean = boolean>(
  factory: UnpluginFactory<UserOptions, Nested>,
) {
  return getRspackPlugin(factory)
}
