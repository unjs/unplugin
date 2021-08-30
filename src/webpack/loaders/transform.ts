import type { LoaderContext } from 'webpack'
import { UnpluginContext } from '../../types'

export default async function transform (this: LoaderContext<any>, source: string, map: any) {
  const callback = this.async()
  const { unpluginName } = this.query
  const plugin = this._compiler?.$unpluginContext[unpluginName]

  if (!plugin?.transform) {
    return callback(null, source, map)
  }

  const context: UnpluginContext = {
    error: error => this.emitError(typeof error === 'string' ? new Error(error) : error),
    warn: error => this.emitWarning(typeof error === 'string' ? new Error(error) : error)
  }
  const res = await plugin.transform.call(context, source, this.resource)

  if (res == null) {
    callback(null, source, map)
  } else if (typeof res !== 'string') {
    callback(null, res.code, map == null ? map : (res.map || map))
  } else {
    callback(null, res, map)
  }
}
