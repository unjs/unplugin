import { sep } from 'path'

export function slash (path: string) {
  return path.replace(/[\\/]/g, sep)
}
