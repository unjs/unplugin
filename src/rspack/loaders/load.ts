import type { LoaderContext } from '@rspack/core'
import type { UnpluginContext, UnpluginOptions } from '../../types'
import { createRspackContext } from '../context'
import { normalizeAbsolutePath } from '../../utils'

export default async function load(this: LoaderContext, source: string, map: any) {
  const callback = this.async()

  const id = this.resource
  const { plugin } = this.getOptions() as { plugin: UnpluginOptions }

  if (!plugin?.load || !id)
    return callback(null, source, map)

  if (plugin.loadInclude && !plugin.loadInclude(id))
    return callback(null, source, map)

  const context: UnpluginContext = {
    error: error => this.emitError(typeof error === 'string' ? new Error(error) : error),
    warn: error => this.emitWarning(typeof error === 'string' ? new Error(error) : error),
  }

  const res = await plugin.load.call(
    Object.assign(
      this._compilation && createRspackContext(this._compilation),
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
