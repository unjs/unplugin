import * as vite from 'vite'
import * as rollup from 'rollup'
import * as webpack from 'webpack'
import * as rspack from '@rspack/core'
import * as esbuild from 'esbuild'

export * from '../../src/utils'

export const viteBuild = vite.build
export const rollupBuild = rollup.rollup
export const esbuildBuild = esbuild.build
export const webpackBuild: typeof webpack.webpack = webpack.webpack || (webpack as any).default || webpack
export const rspackBuild = rspack.rspack

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
  vite: viteBuild,
  esbuild: esbuildBuild,
}
