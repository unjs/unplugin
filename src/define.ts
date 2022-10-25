/* eslint-disable no-redeclare */
import { getEsbuildPlugin } from './esbuild'
import { getRollupPlugin } from './rollup'
import { UnpluginInstance, UnpluginFactory } from './types'
import { getVitePlugin } from './vite'
import { getWebpackPlugin } from './webpack'

export function createUnplugin<UserOptions> (
  factory: UnpluginFactory<UserOptions, false>
): UnpluginInstance<UserOptions, false>
export function createUnplugin<UserOptions> (
  factory: UnpluginFactory<UserOptions, true>
): UnpluginInstance<UserOptions, true>
export function createUnplugin<UserOptions, Nested extends boolean> (
  factory: UnpluginFactory<UserOptions, Nested>
): UnpluginInstance<UserOptions, Nested> {
  return {
    get esbuild () {
      return getEsbuildPlugin(factory)
    },
    get rollup () {
      return getRollupPlugin(factory)
    },
    get vite () {
      return getVitePlugin(factory)
    },
    get webpack () {
      return getWebpackPlugin(factory)
    },
    get raw () {
      return factory
    }
  }
}
