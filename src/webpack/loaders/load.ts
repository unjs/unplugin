import type { LoaderContext } from 'webpack'
import { UnpluginContext } from '../../types'
import { slash } from '../utils'

export default async function load (this: LoaderContext<any>, source: string, map: any) {
  const callback = this.async()
  const { unpluginName } = this.query
  const plugin = this._compiler?.$unpluginContext[unpluginName]
  let id = this.resource

  if (!plugin?.load || !id) {
    return callback(null, source, map)
  }

  const context: UnpluginContext = {
    error: error => this.emitError(typeof error === 'string' ? new Error(error) : error),
    warn: error => this.emitWarning(typeof error === 'string' ? new Error(error) : error)
  }

  if (id.startsWith(plugin.__virtualModulePrefix)) {
    id = id.slice(plugin.__virtualModulePrefix.length)
  }

  const res = await plugin.load.call(context, slash(id))

  if (res == null) {
    callback(null, source, map)
  } else if (typeof res !== 'string') {
    callback(null, res.code, res.map ?? map)
  } else {
    callback(null, res, map)
  }
}
