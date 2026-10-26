import type { Buffer } from 'node:buffer'
import type { LoaderContext } from 'webpack'
import type { ResolvedUnpluginOptions } from '../../types'
import { normalizeObjectHook } from '../../utils/filter'
import { normalizeAbsolutePath } from '../../utils/webpack-like'
import { createBuildContext, createContext } from '../context'

// Receive the source as a Buffer. Without this, webpack decodes every file it passes through
// this loader as UTF-8 text, which corrupts binary files (images, fonts) the load hook ignores.
// https://webpack.js.org/api/loaders/#raw-loader
export const raw = true

export default async function load(this: LoaderContext<any>, source: string | Buffer, map: any): Promise<void> {
  const callback = this.async()
  const { plugin } = this.query as { plugin: ResolvedUnpluginOptions }
  let id = this.resource

  if (!plugin?.load || !id)
    return callback(null, source, map)

  if (id.startsWith(plugin.__virtualModulePrefix))
    id = decodeURIComponent(id.slice(plugin.__virtualModulePrefix.length))

  const context = createContext(this)
  const { handler } = normalizeObjectHook('load', plugin.load)
  const res = await handler.call(
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
