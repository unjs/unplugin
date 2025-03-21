import type { LoaderContext } from '@rspack/core'
import type { ResolvedUnpluginOptions } from '../../types'
import { createBuildContext, createContext } from '../context'

export default async function transform(
  this: LoaderContext,
  source: string,
  map: any,
): Promise<void> {
  const callback = this.async()
  const { plugin } = this.query as { plugin: ResolvedUnpluginOptions }
  if (!plugin?.transform)
    return callback(null, source, map)

  const id = this.resource
  const context = createContext(this)

  try {
    const res = await plugin.transform.call(
      Object.assign(
        {},
        this._compilation && createBuildContext(this._compiler, this._compilation, this),
        context,
      ),
      source,
      id,
    )

    if (res == null)
      callback(null, source, map)
    else if (typeof res !== 'string')
      callback(null, res.code, map == null ? map : (res.map || map))
    else callback(null, res, map)
  }
  catch (error) {
    callback(error as Error)
  }
}
