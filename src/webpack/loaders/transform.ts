import type { LoaderContext } from 'webpack'
import type { ResolvedUnpluginOptions } from '../../types'
import { createBuildContext, createContext } from '../context'

export default async function transform(this: LoaderContext<any>, source: string, map: any) {
  const callback = this.async()

  const { plugin } = this.query as { plugin: ResolvedUnpluginOptions }
  if (!plugin?.transform)
    return callback(null, source, map)

  const context = createContext(this)
  const res = await plugin.transform.call(
    Object.assign({}, createBuildContext({
      addWatchFile: (file) => {
        this.addDependency(file)
      },
      getWatchFiles: () => {
        return this.getDependencies()
      },
    }, this._compiler!, this._compilation, this), context),
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
