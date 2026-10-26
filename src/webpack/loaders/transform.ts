import type { Buffer } from 'node:buffer'
import type { LoaderContext } from 'webpack'
import type { ResolvedUnpluginOptions } from '../../types'
import { normalizeObjectHook } from '../../utils/filter'
import { createBuildContext, createContext } from '../context'

// Receive the source as a Buffer so that files the transform hook does not handle, like images and
// fonts, are passed on byte for byte instead of being decoded as UTF-8 text.
// https://webpack.js.org/api/loaders/#raw-loader
export const raw = true

export default async function transform(this: LoaderContext<any>, source: string | Buffer, map: any): Promise<void> {
  const callback = this.async()

  const { plugin } = this.query as { plugin: ResolvedUnpluginOptions }
  if (!plugin?.transform)
    return callback(null, source, map)

  const context = createContext(this)
  const { handler, filter } = normalizeObjectHook('transform', plugin.transform)
  const code = typeof source === 'string' ? source : source.toString('utf-8')
  if (!filter(this.resource, code))
    return callback(null, source, map)

  try {
    const res = await handler.call(
      Object.assign({}, createBuildContext({
        addWatchFile: (file) => {
          this.addDependency(file)
        },
        getWatchFiles: () => {
          return this.getDependencies()
        },
      }, this._compiler!, this._compilation, this, map), context),
      code,
      this.resource,
    )

    if (res == null)
      callback(null, source, map)
    else if (typeof res !== 'string')
      callback(null, res.code, map == null ? map : (res.map || map))
    else
      callback(null, res, map)
  }
  catch (error) {
    if (error instanceof Error) {
      callback(error)
    }
    else {
      callback(new Error(String(error)))
    }
  }
}
