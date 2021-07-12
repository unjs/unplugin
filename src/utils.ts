import { existsSync, mkdirSync } from 'fs'
import { dirname, join, resolve } from 'path'

export function getPackageRoot () {
  return resolve(dirname(__dirname))
}

export function getLoaderPath (name: string) {
  const root = getPackageRoot()
  const tempDir = join(root, 'temp')
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir)
  }

  return join(tempDir, 'loader-' + name + '.js')
}
