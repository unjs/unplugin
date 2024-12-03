import type { LoaderContext } from '@rspack/core'
import type { ResolvedUnpluginOptions } from '../../types'
import { normalizeAbsolutePath } from '../../utils/webpack-like'
import { createBuildContext, createContext } from '../context'
import { decodeVirtualModuleId, isVirtualModuleId } from '../utils'

export default async function load(this: LoaderContext, source: string, map: any): Promise<void> {
  const callback = this.async()
  const { plugin } = this.query as { plugin: ResolvedUnpluginOptions }

  let id = this.resource
  if (!plugin?.load || !id)
    return callback(null, source, map)

  if (isVirtualModuleId(id, plugin))
    id = decodeVirtualModuleId(id, plugin)

  const context = createContext(this)
  const res = await plugin.load.call(
    Object.assign(
      {},
      this._compilation && createBuildContext(this._compiler, this._compilation, this),
      context,
    ),
    normalizeAbsolutePath(id),
  )

  if (res == null)
    callback(null, source, map)
  else if (typeof res !== 'string')
    callback(null, res.code, res.map ?? map)
  else
    callback(null, res, map)
}
