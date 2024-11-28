import type { LoaderContext } from '@rspack/core'
import MagicString from 'magic-string'
import { createBuildContext, createContext } from '../context'

export default async function transform(
  this: LoaderContext,
  source: string,
  map: any,
) {
  const callback = this.async()

  let unpluginName: string
  if (typeof this.query === 'string') {
    const query = new URLSearchParams(this.query)
    unpluginName = query.get('unpluginName')!
  }
  else {
    unpluginName = (this.query as { unpluginName: string }).unpluginName
  }

  const id = this.resource
  const plugin = this._compiler?.$unpluginContext[unpluginName]

  if (!plugin?.transform)
    return callback(null, source, map)

  const context = createContext(this)
  const res = await plugin.transform.call(
    Object.assign(
      {
        getCombinedSourcemap: () => {
          if (!map) {
            const magicString = new MagicString(source)
            return magicString.generateMap({ hires: true, includeContent: true, source: id })
          }
          return map
        },
      },
      this._compilation && createBuildContext(this._compiler, this._compilation, this),
      context,
    ),
    source,
    id,
  )

  if (res == null)
    callback(null, source, map)
  else if (typeof res !== 'string')
    callback(null, res.code, map == null ? map : (res.map || map))
  else callback(null, res, map)
}
