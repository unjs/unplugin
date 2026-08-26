import type { LoaderContext } from 'webpack'
import type { ResolvedUnpluginOptions } from '../../types'
import { normalizeObjectHook } from '../../utils/filter'
import { createBuildContext, createContext } from '../context'

export default async function transform(this: LoaderContext<any>, source: string, map: any): Promise<void> {
  const callback = this.async()

  const { plugin } = this.query as { plugin: ResolvedUnpluginOptions }
  if (!plugin?.transform)
    return callback(null, source, map)

  const context = createContext(this)
  const { handler, filter } = normalizeObjectHook('transform', plugin.transform)
  if (!filter(this.resource, source))
    return callback(null, source, map)

  try {
    const res = await handler.call(
      Object.assign({}, createBuildContext({
        addWatchFile: (file) => {
          this.addDependency(file)
        },
        getWatchFiles: () => {
          return this.getDependencies()
        },
      }, this._compiler!, this._compilation, this, map), context),
      source,
      this.resource,
    )

    if (res == null) {
      callback(null, source, map)
    }
    else if (typeof res !== 'string') {
      const resultMap = map && res.map
        ? (await import('@jridgewell/remapping')).default(
            [res.map, map],
            () => null,
          )
        : (res.map ?? map)
      callback(null, res.code, resultMap)
    }
    else {
      callback(null, res, map)
    }
  }
  catch (error) {
    if (error instanceof Error) {
      callback(error)
    }
    else {
      callback(new Error(String(error)))
    }
  }
}
