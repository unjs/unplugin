import type { LoaderContext } from 'webpack'
import { createBuildContext, createContext } from '../context'

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

  const context = createContext(this)
  const res = await plugin.transform.call(
    { ...createBuildContext({
      addWatchFile: (file) => {
        this.addDependency(file)
      },
      getWatchFiles: () => {
        return this.getDependencies()
      },
      getNativeBuildContext: () => {
        return this
      },
    }, this._compilation), ...context },
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
