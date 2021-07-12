import type { LoaderContext } from 'webpack'

export default async function (this: LoaderContext<any>, source: string, map: any) {
  const callback = this.async()
  const { unpluginName } = this.query
  // @ts-expect-error
  const plugin = this._compiler.$unpluginContext[unpluginName]

  const res = await plugin.transform(source, this.resource)

  if (res == null) {
    callback(null, source, map)
  } else if (typeof res !== 'string') {
    callback(null, res.code, res.map)
  } else {
    callback(null, res, map)
  }
}
