import type { LoaderContext } from 'webpack'
import type { UnpluginContext } from '../../types'
import { createContext } from '../context'
import { normalizeAbsolutePath } from '../../utils'

export default async function load(this: LoaderContext<any>, source: string, map: any) {
  const callback = this.async()
  const { plugin } = this.query

  let id = this.resource

  if (!plugin?.load || !id)
    return callback(null, source, map)

  const context: UnpluginContext = {
    error: error => this.emitError(typeof error === 'string' ? new Error(error) : error),
    warn: error => this.emitWarning(typeof error === 'string' ? new Error(error) : error),
  }

  if (id.startsWith(plugin.__virtualModulePrefix))
    id = decodeURIComponent(id.slice(plugin.__virtualModulePrefix.length))

  const res = await plugin.load.call(
    Object.assign(this._compilation && createContext(this._compilation) as any, context),
    normalizeAbsolutePath(id),
  )

  if (res == null)
    callback(null, source, map)
  else if (typeof res !== 'string')
    callback(null, res.code, res.map ?? map)
  else
    callback(null, res, map)
}
