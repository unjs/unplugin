export function slash (path: string) {
  return path.replace(/\\/g, '/')
}

export function backSlash (path: string) {
  return path.replace(/\//g, '\\')
}
