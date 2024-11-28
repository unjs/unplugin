import type { LoaderContext } from 'webpack'
import MagicString from 'magic-string'
import { resolveQuery } from '../../utils'
import { createBuildContext, createContext } from '../context'

export default async function transform(this: LoaderContext<{ unpluginName: string }>, source: string, map: any) {
  const callback = this.async()

  const unpluginName = resolveQuery(this.query)
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
            return magicString.generateMap({ hires: true, includeContent: true, source: this.resource })
          }
          return map
        },
      },
      createBuildContext({
        addWatchFile: (file) => {
          this.addDependency(file)
        },
        getWatchFiles: () => {
          return this.getDependencies()
        },
      }, this._compiler!, this._compilation, this),
      context,
    ),
    source,
    this.resource,
  )

  if (res == null)
    callback(null, source, map)
  else if (typeof res !== 'string')
    callback(null, res.code, map == null ? map : (res.map || map))
  else
    callback(null, res, map)
}
