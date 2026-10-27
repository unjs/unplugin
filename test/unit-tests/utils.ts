import * as rsbuild from '@rsbuild/core'
import * as rspack from '@rspack/core'
import * as esbuild from 'esbuild'
import * as rolldown from 'rolldown'
import * as rollup from 'rollup'
import * as vite from 'vite'
import * as webpack from 'webpack'

export * from '../../src/utils/general'

export const viteBuild: typeof vite.build = vite.build
export const rollupBuild: typeof rollup.rollup = rollup.rollup
export const rolldownBuild: typeof rolldown.build = rolldown.build
export const esbuildBuild: typeof esbuild.build = esbuild.build
export const webpackBuild: typeof webpack.webpack = webpack.webpack || (webpack as any).default || webpack
export const rspackBuild: typeof rspack.rspack = rspack.rspack
export async function rsbuildBuild(options?: rsbuild.CreateRsbuildOptions, buildOptions?: rsbuild.BuildOptions): Promise<rsbuild.BuildResult> {
  const instance = await rsbuild.createRsbuild(options)
  const result = await instance.build(buildOptions)
  await result.close()
  return result
}
export const bunBuild: typeof Bun.build = typeof Bun !== 'undefined'
  ? Bun.build
  : () => {
      throw new ReferenceError('Bun.build does not exist in this environment. Please run your app with the Bun runtime.')
    }

export const webpackVersion: string = ((webpack as any).default || webpack).version

/** Run one webpack compilation and reject if it reports errors. */
export function runWebpack(options: webpack.Configuration): Promise<webpack.Stats> {
  return new Promise((resolve, reject) => {
    webpackBuild(options, (error, stats) => {
      if (error)
        reject(error)
      else if (!stats || stats.hasErrors())
        reject(new Error(stats?.toString({ all: false, errors: true, errorDetails: true }) ?? 'webpack returned no stats'))
      else
        resolve(stats)
    })
  })
}

/** Run one rspack compilation and reject if it reports errors. */
export function runRspack(options: rspack.RspackOptions): Promise<rspack.Stats> {
  return new Promise((resolve, reject) => {
    rspackBuild(options, (error, stats) => {
      if (error)
        reject(error)
      else if (!stats || stats.hasErrors())
        reject(new Error(stats?.toString({ all: false, errors: true, errorDetails: true }) ?? 'rspack returned no stats'))
      else
        resolve(stats)
    })
  })
}

export const build: {
  webpack: typeof webpack.webpack
  rspack: typeof rspackBuild
  rsbuild: typeof rsbuildBuild
  rollup: typeof rollupBuild
  rolldown: typeof rolldownBuild
  vite: typeof viteBuild
  esbuild: typeof esbuildBuild
  bun: typeof bunBuild
} = {
  webpack: webpackBuild,
  rspack: rspackBuild,
  rsbuild: rsbuildBuild,
  rollup: rollupBuild,
  rolldown: rolldownBuild,
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
  bun: bunBuild,
}
