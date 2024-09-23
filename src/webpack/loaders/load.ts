import type { LoaderContext } from 'webpack'
import { createBuildContext, createContext } from '../context'
import { normalizeAbsolutePath, resolveQuery } from '../../utils'

export default async function load(this: LoaderContext<{ unpluginName: string }>, source: string, map: any) {
  const callback = this.async()

  const unpluginName = resolveQuery(this.query)
  const plugin = this._compiler?.$unpluginContext[unpluginName]
  let id = this.resource

  if (!plugin?.load || !id)
    return callback(null, source, map)

  if (id.startsWith(plugin.__virtualModulePrefix))
    id = decodeURIComponent(id.slice(plugin.__virtualModulePrefix.length))

  const context = createContext(this)

  id = normalizeAbsolutePath(id)
  if (id.startsWith('\\'))
    id = id.replace(/\\/g, '/')

  const res = await plugin.load.call(
    Object.assign({}, createBuildContext({
      addWatchFile: (file) => {
        this.addDependency(file)
      },
      getWatchFiles: () => {
        return this.getDependencies()
      },
    }, this._compiler!, this._compilation, this), context),
    id,
  )

  if (res == null)
    callback(null, source, map)
  else if (typeof res !== 'string')
    callback(null, res.code, res.map ?? map)
  else
    callback(null, res, map)
}
