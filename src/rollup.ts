import { UnpluginInstance, UnpluginOptions } from './types'

export function getRollupPlugin <UserOptions = {}, ResolvedContext = UserOptions> (
  options: UnpluginOptions<UserOptions, ResolvedContext>
): UnpluginInstance<UserOptions>['rollup'] {
  return (userOptions?: UserOptions) => {
    const context = options.setup(userOptions)
    const hooks = options.hooks(context)

    return {
      name: options.name,
      transform (code, id) {
        if (!hooks.transformInclude?.(id)) {
          return null
        }
        return hooks.transform?.(code, id) || null
      }
    }
  }
}
