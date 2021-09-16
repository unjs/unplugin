import type { LoaderContext } from 'webpack'
import { UnpluginContext } from '../../types'

export default async function transform (this: LoaderContext<any>, source: string, map: any) {
  const callback = this.async()
  const { unpluginName } = this.query
  const plugin = this._compiler?.$unpluginContext[unpluginName]

  if (!plugin?.transform) {
    return callback(null, source, map)
  }

  const context: UnpluginContext = {
    error: error => this.emitError(typeof error === 'string' ? new Error(error) : error),
    warn: error => this.emitWarning(typeof error === 'string' ? new Error(error) : error)
  }
  const res = await plugin.transform.call(context, source, this.resource)

  if (res == null) {
    callback(null, source, map)
  } else if (typeof res !== 'string') {
    // only pass sourcemap when sourcemap is provided upstream
    const newMap = map == null ? map : (res.map || map)
    // clean up nullish sources produced by magic-string
    if (newMap && Array.isArray(newMap.sources)) {
      const excluded: number[] = []
      newMap.sources = newMap.sources.filter((i:any, idx:number) => {
        if (i == null) {
          excluded.push(idx)
          return false
        }
        return true
      })
      newMap.sources = newMap.sources.filter((_: any, idx: number) => {
        return !excluded.includes(idx)
      })
    }
    callback(null, res.code, newMap)
  } else {
    callback(null, res, map)
  }
}
