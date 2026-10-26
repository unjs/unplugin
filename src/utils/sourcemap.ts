import remapping from '@jridgewell/remapping'

/**
 * Pick the source map a loader should pass on after a transform.
 * The first loader in a chain receives no input map, so the transformed map is used as is;
 * otherwise both layers are composed instead of dropping either one.
 */
export function mergeSourceMaps(transformed: any, input: any, resource?: string): any {
  if (!transformed)
    return input
  // An empty input map has nothing to trace back to, composing it would erase the transformed mappings
  if (!input || input.mappings === '')
    return transformed

  const transformedMap = typeof transformed === 'string'
    ? JSON.parse(transformed)
    : transformed
  // remapping only accepts the array form when every outer map has a single source
  if (transformedMap.sources?.length === 1)
    return remapping([transformed, input], () => null)

  // Otherwise trace only the source that is the module being transformed and keep the others
  const file = resource?.split('?')[0].replace(/\\/g, '/')
  let traced = false
  return remapping(transformed, (source) => {
    // The input map's own sources go through this callback too, so trace only once
    if (traced)
      return null
    const normalized = source.replace(/\\/g, '/').replace(/^\.\//, '')
    if (!file || (file !== normalized && !file.endsWith(`/${normalized}`)))
      return null
    traced = true
    return input
  })
}
