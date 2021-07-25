import type { LoaderContext } from 'webpack'
import '../../types'

export default async function load (this: LoaderContext<any>, source: string) {
  const callback = this.async()
  const { unpluginName } = this.query
  const plugin = this._compiler?.$unpluginContext[unpluginName]

  if (!plugin?.load) {
    return callback(null, source)
  }

  const res = await plugin.load(this.resource)

  if (res == null) {
    callback(null, source)
  } else {
    callback(null, res)
  }
}
