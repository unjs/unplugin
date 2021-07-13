import type { LoaderContext } from 'webpack'
import '../../types'

export default async function transform (this: LoaderContext<any>, source: string, map: any) {
  const callback = this.async()
  const { unpluginName } = this.query
  const plugin = this._compiler?.$unpluginContext[unpluginName]

  if (!plugin?.transform) {
    return callback(null, source, map)
  }

  const res = await plugin.transform(source, this.resource)

  if (res == null) {
    callback(null, source, map)
  } else if (typeof res !== 'string') {
    callback(null, res.code, res.map)
  } else {
    callback(null, res, map)
  }
}
