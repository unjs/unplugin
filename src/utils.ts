import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { join } from 'path/posix'

export function getPackageRoot () {
  return dirname(require.resolve('unplugin/package.json'))
}

export function getLoaderPath (name: string) {
  const root = getPackageRoot()
  const tempDir = join(root, 'temp')
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir)
  }

  return join(tempDir, 'loader-' + name + '.js')
}
