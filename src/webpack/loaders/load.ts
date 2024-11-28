import type { LoaderContext } from 'webpack'
import { normalizeAbsolutePath } from '../../utils'
import { createBuildContext, createContext } from '../context'

export default async function load(this: LoaderContext<any>, source: string, map: any) {
  const callback = this.async()
  const { plugin } = this.query
  let id = this.resource

  if (!plugin?.load || !id)
    return callback(null, source, map)

  if (id.startsWith(plugin.__virtualModulePrefix))
    id = decodeURIComponent(id.slice(plugin.__virtualModulePrefix.length))

  const context = createContext(this)
  const res = await plugin.load.call(
    Object.assign({}, createBuildContext({
      addWatchFile: (file) => {
        this.addDependency(file)
      },
      getWatchFiles: () => {
        return this.getDependencies()
      },
    }, this._compiler!, this._compilation, this), context),
    normalizeAbsolutePath(id),
  )

  if (res == null)
    callback(null, source, map)
  else if (typeof res !== 'string')
    callback(null, res.code, res.map ?? map)
  else
    callback(null, res, map)
}
