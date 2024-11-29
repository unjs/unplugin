import * as rspack from '@rspack/core'
import * as esbuild from 'esbuild'
import * as rollup from 'rollup'
import * as vite from 'vite'
import * as webpack from 'webpack'

export * from '../../src/utils/general'

export const viteBuild = vite.build
export const rollupBuild = rollup.rollup
export const esbuildBuild = esbuild.build
export const webpackBuild: typeof webpack.webpack = webpack.webpack || (webpack as any).default || webpack
export const rspackBuild: typeof rspack.rspack = rspack.rspack

export const webpackVersion = ((webpack as any).default || webpack).version

export const build: {
  webpack: typeof webpack.webpack
  rspack: typeof rspackBuild
  rollup: typeof rollupBuild
  vite: typeof viteBuild
  esbuild: typeof esbuildBuild
} = {
  webpack: webpackBuild,
  rspack: rspackBuild,
  rollup: rollupBuild,
  vite(config) {
    return viteBuild(vite.mergeConfig(config || {}, {
      build: {
        rollupOptions: {
          logLevel: 'silent',
        },
      },
      logLevel: 'silent',
    }))
  },
  esbuild: esbuildBuild,
}
