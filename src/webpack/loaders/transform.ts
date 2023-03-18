import type { LoaderContext } from 'webpack'
import type { UnpluginContext } from '../../types'
import { createContext } from '../context'

export default async function transform(this: LoaderContext<{ unpluginName: string }>, source: string, map: any) {
  const callback = this.async()

  let unpluginName: string
  if (typeof this.query === 'string') {
    const query = new URLSearchParams(this.query)
    unpluginName = query.get('unpluginName')!
  }
  else {
    unpluginName = this.query.unpluginName
  }

  const plugin = this._compiler?.$unpluginContext[unpluginName]

  if (!plugin?.transform)
    return callback(null, source, map)

  const context: UnpluginContext = {
    error: error => this.emitError(typeof error === 'string' ? new Error(error) : error),
    warn: error => this.emitWarning(typeof error === 'string' ? new Error(error) : error),
  }
  const res = await plugin.transform.call(Object.assign(this._compilation && createContext(this._compilation) as any, context), source, this.resource)

  if (res == null)
    callback(null, source, map)
  else if (typeof res !== 'string')
    callback(null, res.code, map == null ? map : (res.map || map))
  else
    callback(null, res, map)
}
