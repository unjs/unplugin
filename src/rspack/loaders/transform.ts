import type { LoaderContext } from '@rspack/core'
import type { ResolvedUnpluginOptions } from '../../types'
import { normalizeObjectHook } from '../../utils/filter'
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
  const { handler, filter } = normalizeObjectHook('transform', plugin.transform)
  if (!filter(this.resource, source))
    return callback(null, source, map)

  try {
    const res = await handler.call(
      Object.assign(
        {},
        this._compilation && createBuildContext(this._compiler, this._compilation, this, map),
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
    if (error instanceof Error) {
      callback(error)
    }
    else {
      callback(new Error(String(error)))
    }
  }
}
