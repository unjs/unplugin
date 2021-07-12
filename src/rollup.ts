import { UnpluginInstance, UnpluginOptions } from './types'

export function getRollupPlugin <UserOptions = {}> (
  options: UnpluginOptions<UserOptions>
): UnpluginInstance<UserOptions>['rollup'] {
  return (userOptions?: UserOptions) => {
    const hooks = options.setup(userOptions)

    return {
      name: options.name,
      enforce: options.enforce,
      transform (code, id) {
        if (!hooks.transformInclude?.(id)) {
          return null
        }
        return hooks.transform?.(code, id) || null
      }
    }
  }
}
