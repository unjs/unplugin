import nodeModule, { createRequire } from 'node:module'
import path from 'node:path'
import { registerSync } from 'unloader'
import { describe, expect, it } from 'vitest'
import { createUnplugin } from '../../../src/define'
import { onlyBun } from '../../utils'
import { build } from '../utils'

const require = createRequire(import.meta.url)
const rollupVersion: string = require('rollup/package.json').version
const viteVersion: string = require('vite/package.json').version
const rolldownVersion: string = require('rolldown/package.json').version
const unloaderVersion: string = require('unloader/package.json').version
const webpackVersion: string = require('webpack/package.json').version
const rspackVersion: string = require('@rspack/core/package.json').version

const entry = path.resolve(__dirname, '../filter/test-src/entry.js')
const runWithRegisterHooks = typeof (nodeModule as any).registerHooks === 'function' ? it : it.skip

describe('frameworkVersion', () => {
  it('rollup sets frameworkVersion from rollupVersion', async () => {
    let hostVersion: string | undefined
    let frameworkVersion: string | undefined
    const plugin = createUnplugin((_options, meta) => ({
      name: 'framework-version-rollup',
      buildStart() {
        hostVersion = (this as any).meta?.rollupVersion
        frameworkVersion = meta.frameworkVersion
      },
    }))

    await build.rollup({
      input: entry,
      plugins: [plugin.rollup()],
    })

    expect(hostVersion).toBe(rollupVersion)
    expect(frameworkVersion).toBe(rollupVersion)
  })

  it('vite sets frameworkVersion from viteVersion', async () => {
    let hostVersion: string | undefined
    let frameworkVersion: string | undefined
    const plugin = createUnplugin((_options, meta) => ({
      name: 'framework-version-vite',
      buildStart() {
        hostVersion = (this as any).meta?.viteVersion
        frameworkVersion = meta.frameworkVersion
      },
    }))

    await build.vite({
      clearScreen: false,
      plugins: [plugin.vite()],
      build: {
        lib: {
          entry,
          name: 'TestLib',
        },
        write: false,
      },
    })

    expect(hostVersion).toBe(viteVersion)
    expect(frameworkVersion).toBe(viteVersion)
  })

  it('rolldown sets frameworkVersion from rolldownVersion', async () => {
    let hostVersion: string | undefined
    let frameworkVersion: string | undefined
    const plugin = createUnplugin((_options, meta) => ({
      name: 'framework-version-rolldown',
      buildStart() {
        hostVersion = (this as any).meta?.rolldownVersion
        frameworkVersion = meta.frameworkVersion
      },
    }))

    await build.rolldown({
      input: entry,
      plugins: [plugin.rolldown()],
    })

    expect(hostVersion).toBe(rolldownVersion)
    expect(frameworkVersion).toBe(rolldownVersion)
  })

  runWithRegisterHooks('unloader sets frameworkVersion from unloaderVersion', () => {
    let hostVersion: string | undefined
    let frameworkVersion: string | undefined
    const plugin = createUnplugin<undefined, false>((_options, meta) => ({
      name: 'framework-version-unloader',
      buildStart() {
        hostVersion = (this as any).meta?.unloaderVersion
        frameworkVersion = meta.frameworkVersion
      },
    }))

    const deactivate = registerSync({
      plugins: [plugin.unloader() as any],
    })
    deactivate()

    expect(hostVersion).toBe(unloaderVersion)
    expect(frameworkVersion).toBe(unloaderVersion)
  })

  it('webpack sets frameworkVersion from compiler.webpack.version', async () => {
    let hostVersion: string | undefined
    let frameworkVersion: string | undefined
    const plugin = createUnplugin((_options, meta) => ({
      name: 'framework-version-webpack',
      buildStart() {
        hostVersion = (this.getNativeBuildContext?.() as any)?.compiler?.webpack?.version
        frameworkVersion = meta.frameworkVersion
      },
    }))

    await new Promise<void>((resolve) => {
      build.webpack(
        {
          entry,
          plugins: [plugin.webpack()],
        },
        () => resolve(),
      )
    })

    expect(hostVersion).toBe(webpackVersion)
    expect(frameworkVersion).toBe(webpackVersion)
  }, 20_000)

  it('rspack sets frameworkVersion from compiler.rspack.rspackVersion', async () => {
    let hostVersion: string | undefined
    let frameworkVersion: string | undefined
    const plugin = createUnplugin((_options, meta) => ({
      name: 'framework-version-rspack',
      buildStart() {
        hostVersion = (this.getNativeBuildContext?.() as any)?.compiler?.rspack?.rspackVersion
        frameworkVersion = meta.frameworkVersion
      },
    }))

    await new Promise<void>((resolve) => {
      build.rspack(
        {
          entry,
          plugins: [plugin.rspack()],
        },
        () => resolve(),
      )
    })

    expect(hostVersion).toBe(rspackVersion)
    expect(frameworkVersion).toBe(rspackVersion)
  }, 20_000)

  onlyBun('bun sets frameworkVersion from Bun.version', async () => {
    let hostVersion: string | undefined
    let frameworkVersion: string | undefined
    const plugin = createUnplugin<undefined, false>((_options, meta) => ({
      name: 'framework-version-bun',
      buildStart() {
        hostVersion = Bun.version
        frameworkVersion = meta.frameworkVersion
      },
    }))

    await build.bun({
      entrypoints: [entry],
      outdir: path.resolve(__dirname, '../filter/test-out/bun-framework-version'),
      plugins: [plugin.bun()],
    })

    expect(hostVersion).toBe(Bun.version)
    expect(frameworkVersion).toBe(Bun.version)
  })
})
