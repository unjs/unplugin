import type { LoaderContext } from 'webpack'
import '../../types'

export default async function load (this: LoaderContext<any>, source: string) {
  const callback = this.async()
  const { unpluginName } = this.query
  const plugin = this._compiler?.$unpluginContext[unpluginName]

  if (!plugin?.resolveId || !plugin?.load) {
    return callback(null, source)
  }

  const id = await plugin.resolveId(this.resource)
  if (id == null) {
    return callback(null, source)
  }

  const res = await plugin.load(id)

  if (res == null) {
    callback(null, source)
  } else {
    callback(null, res)
  }
}
