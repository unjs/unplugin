import type { InputFileSystem } from 'webpack'
import type { UnpluginContextFs } from '../types'
import pify from 'pify'

// Dynamic import node:fs module since it may not be available in some environments
function createNodeFs(): UnpluginContextFs {
  const fsPromiseModule = import('node:fs/promises')
  return {
    readFile: async (path, options) => {
      const fs = await fsPromiseModule
      return fs.readFile(path, options)
    },
    stat: async (path, options) => {
      const fs = await fsPromiseModule
      return fs.stat(path, options)
    },
    lstat: async (path, options) => {
      const fs = await fsPromiseModule
      return fs.lstat(path, options)
    },
  }
}

export function createBuildContextFs(inputFs?: InputFileSystem | null): UnpluginContextFs {
  const fs = inputFs ? pify(inputFs) : createNodeFs()

  return {
    readFile: fs.readFile as UnpluginContextFs['readFile'],
    stat: fs.stat as UnpluginContextFs['stat'],
    lstat: fs.lstat as UnpluginContextFs['lstat'],
  }
}
