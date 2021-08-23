import type { LoaderContext } from 'webpack'
import { UnpluginContext } from '../../context'
import '../../types'

export default async function load (this: LoaderContext<any>, source: string) {
  const callback = this.async()
  const { unpluginName } = this.query
  const plugin = this._compiler?.$unpluginContext[unpluginName]

  if (!plugin?.load) {
    return callback(null, source)
  }

  const context: UnpluginContext = {
    error: error => this.emitError(typeof error === 'string' ? new Error(error) : error),
    warn: error => this.emitWarning(typeof error === 'string' ? new Error(error) : error)
  }
  const res = await plugin.load.call(context, this.resource)

  if (res == null) {
    callback(null, source)
  } else {
    callback(null, res)
  }
}
