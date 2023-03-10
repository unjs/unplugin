import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import type { RspackPluginInstance, RuleSetUseItem } from '@rspack/core'
import { toArray } from '../utils'
import type {
  UnpluginContextMeta,
  UnpluginFactory,
  UnpluginInstance,
} from '../types'
import { createRspackContext } from './context'

const _dirname
  = typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url))

const TRANSFORM_LOADER = resolve(
  _dirname,
  __DEV__ ? '../../dist/rspack/loaders/transform' : 'rspack/loaders/transform',
)

const LOAD_LOADER = resolve(
  _dirname,
  __DEV__ ? '../../dist/rspack/loaders/load' : 'rspack/loaders/load',
)

export function getRspackPlugin<UserOptions = {}>(
  factory: UnpluginFactory<UserOptions>,
): UnpluginInstance<UserOptions>['rspack'] {
  return (userOptions?: UserOptions): RspackPluginInstance => {
    return {
      apply(compiler) {
        const meta: UnpluginContextMeta = {
          framework: 'rspack',
          rspack: {
            compiler,
          },
        }
        const rawPlugins = toArray(factory(userOptions!, meta))
        for (const plugin of rawPlugins) {
          // transform hook
          if (plugin.transform) {
            const use: RuleSetUseItem = {
              loader: TRANSFORM_LOADER,
              options: { plugin },
            }

            compiler.options.module.rules.unshift({
              include: /.*/,
              use,
            })
          }

          // load hook
          if (plugin.load) {
            const use: RuleSetUseItem = {
              loader: LOAD_LOADER,
              options: { plugin },
            }
            compiler.options.module.rules.unshift({
              include: /.*/,
              use,
            })
          }

          if (plugin.rspack)
            plugin.rspack(compiler)

          if (plugin.buildEnd) {
            compiler.hooks.emit.tapPromise(plugin.name, async (compilation) => {
              await plugin.buildEnd!.call(createRspackContext(compilation))
            })
          }

          if (plugin.writeBundle) {
            compiler.hooks.afterEmit.tap(plugin.name, () => {
              plugin.writeBundle!()
            })
          }
        }
      },
    }
  }
}
