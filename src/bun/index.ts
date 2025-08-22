import type { BunPlugin } from 'bun'
import type { UnpluginContextMeta, UnpluginFactory, UnpluginInstance } from '../types'
import { normalizeObjectHook } from '../utils/filter'
import { toArray } from '../utils/general'

export function getBunPlugin<UserOptions = Record<string, never>>(
  factory: UnpluginFactory<UserOptions>,
): UnpluginInstance<UserOptions>['bun'] {
  return (userOptions?: UserOptions): BunPlugin => {
    const meta: UnpluginContextMeta = {
      framework: 'bun',
    }

    const plugins = toArray(factory(userOptions!, meta))

    if (plugins.length !== 1) {
      throw new Error('[unplugin] Bun plugin does not support multiple plugins per instance yet.')
    }

    const plugin = plugins[0]

    return {
      name: plugin.name,
      async setup(build) {
        if (plugin.buildStart) {
          await plugin.buildStart.call({} as any)
        }

        if (plugin.resolveId) {
          const { handler, filter } = normalizeObjectHook('resolveId', plugin.resolveId)

          build.onResolve({ filter: /.*/ }, async (args) => {
            if (!filter(args.path))
              return

            const result = await handler.call(
              {} as any,
              args.path,
              args.importer,
              { isEntry: args.kind === 'entry-point' },
            )

            if (typeof result === 'string') {
              return { path: result }
            }
            else if (typeof result === 'object' && result !== null) {
              return {
                path: result.id,
                external: result.external,
              }
            }
          })
        }

        if (plugin.load) {
          const { handler, filter } = normalizeObjectHook('load', plugin.load)

          build.onLoad({ filter: /.*/ }, async (args) => {
            const id = args.path

            if (plugin.loadInclude && !plugin.loadInclude(id))
              return
            if (!filter(id))
              return

            const result = await handler.call({} as any, id)

            if (typeof result === 'string') {
              return {
                contents: result,
                loader: args.loader,
              }
            }
            else if (typeof result === 'object' && result !== null) {
              return {
                contents: result.code,
                loader: args.loader,
              }
            }
          })
        }

        if (plugin.buildEnd) {
          process.on('beforeExit', async () => {
            await plugin.buildEnd!.call({} as any)
          })
        }
      },
    }
  }
}
