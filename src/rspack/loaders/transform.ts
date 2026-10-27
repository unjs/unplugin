import type { LoaderContext } from '@rspack/core'
import type { Buffer } from 'node:buffer'
import type { HookFnMap, ResolvedUnpluginOptions } from '../../types'
import type { TransformHookFilter } from '../../utils/filter'
import { normalizeObjectHook } from '../../utils/filter'
import { mergeSourceMaps } from '../../utils/sourcemap'
import { unescapeResourcePath } from '../../utils/webpack-like'
import { createBuildContext, createContext } from '../context'

const filters = new WeakMap<
  NonNullable<ResolvedUnpluginOptions['transform']>,
  { cwd: string, filter: TransformHookFilter }
>()

// Receive the source as a Buffer so that files the transform hook does not handle, like images and
// fonts, are passed on byte for byte instead of being decoded as UTF-8 text.
// https://webpack.js.org/api/loaders/#raw-loader
export const raw = true

export default async function transform(
  this: LoaderContext,
  source: string | Buffer,
  map: any,
): Promise<void> {
  const callback = this.async()
  const { plugin } = this.query as { plugin: ResolvedUnpluginOptions }
  if (!plugin?.transform)
    return callback(null, source, map)

  const id = unescapeResourcePath(this.resource, 'rspack')
  const context = createContext(this)
  const hook = plugin.transform
  const cwd = process.cwd()
  let cached = filters.get(hook)
  let handler: HookFnMap['transform']
  if (cached?.cwd === cwd) {
    handler = typeof hook === 'function'
      ? hook
      : hook.handler
  }
  else {
    const normalized = normalizeObjectHook('transform', hook)
    handler = normalized.handler
    cached = { cwd, filter: normalized.filter }
    filters.set(hook, cached)
  }
  const { filter } = cached
  const code = typeof source === 'string'
    ? source
    : source.toString('utf-8')
  if (!filter(id, code))
    return callback(null, source, map)

  try {
    const res = await handler.call(
      Object.assign(
        {},
        this._compilation && createBuildContext(this._compiler, this._compilation, this, map),
        context,
      ),
      code,
      id,
    )

    if (res == null) {
      callback(null, source, map)
    }
    else if (typeof res !== 'string') {
      callback(null, res.code, this.sourceMap === false
        ? map
        : mergeSourceMaps(res.map, map, id))
    }
    else {
      callback(null, res, map)
    }
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
