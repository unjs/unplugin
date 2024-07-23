import type { LoaderContext } from '@rspack/core'
import { contextOptionsFromCompilation, createBuildContext, createContext } from '../context'
import { normalizeAbsolutePath } from '../../utils'
import { decodeVirtualModuleId, isVirtualModuleId } from '../utils'

export default async function load(this: LoaderContext, source: string, map: any) {
  const callback = this.async()
  const { unpluginName } = this.query as { unpluginName: string }
  const plugin = this._compiler?.$unpluginContext[unpluginName]
  let id = this.resource

  if (!plugin?.load || !id)
    return callback(null, source, map)

  if (isVirtualModuleId(id, plugin))
    id = decodeVirtualModuleId(id, plugin)

  const context = createContext(this)
  const res = await plugin.load.call(
    Object.assign(
      {},
      this._compilation && createBuildContext(contextOptionsFromCompilation(this._compilation), this._compilation),
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
