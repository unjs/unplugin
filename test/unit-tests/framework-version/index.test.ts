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

describe('framework versions', () => {
  it('rollup sets versions.rollup', async () => {
    let hostVersion: string | undefined
    let versionsRollup: string | undefined
    let allVersions: Partial<Record<string, string>> | undefined
    const plugin = createUnplugin((_options, meta) => ({
      name: 'framework-versions-rollup',
      buildStart() {
        hostVersion = (this as any).meta?.rollupVersion
        versionsRollup = meta.versions.rollup
        allVersions = meta.versions
      },
    }))

    await build.rollup({
      input: entry,
      plugins: [plugin.rollup()],
    })

    expect(hostVersion).toBe(rollupVersion)
    expect(versionsRollup).toBe(rollupVersion)
    expect(allVersions).toMatchObject({ rollup: rollupVersion, unplugin: expect.any(String) })
  })

  it('vite sets versions.vite and underlying bundler version', async () => {
    let hostVersion: string | undefined
    let versionsVite: string | undefined
    let allVersions: Partial<Record<string, string>> | undefined
    const plugin = createUnplugin((_options, meta) => ({
      name: 'framework-versions-vite',
      buildStart() {
        hostVersion = (this as any).meta?.viteVersion
        versionsVite = meta.versions.vite
        allVersions = meta.versions
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
    expect(versionsVite).toBe(viteVersion)
    // Vite uses either Rollup or Rolldown as underlying bundler
    expect(allVersions?.vite).toBe(viteVersion)
    expect(allVersions?.rollup || allVersions?.rolldown).toBeDefined()
    expect(allVersions?.unplugin).toBeDefined()
  })

  it('rolldown sets versions.rolldown', async () => {
    let hostVersion: string | undefined
    let versionsRolldown: string | undefined
    let allVersions: Partial<Record<string, string>> | undefined
    const plugin = createUnplugin((_options, meta) => ({
      name: 'framework-versions-rolldown',
      buildStart() {
        hostVersion = (this as any).meta?.rolldownVersion
        versionsRolldown = meta.versions.rolldown
        allVersions = meta.versions
      },
    }))

    await build.rolldown({
      input: entry,
      plugins: [plugin.rolldown()],
    })

    expect(hostVersion).toBe(rolldownVersion)
    expect(versionsRolldown).toBe(rolldownVersion)
    expect(allVersions).toMatchObject({ rolldown: rolldownVersion, unplugin: expect.any(String) })
  })

  runWithRegisterHooks('unloader sets versions.unloader', () => {
    let hostVersion: string | undefined
    let versionsUnloader: string | undefined
    let allVersions: Partial<Record<string, string>> | undefined
    const plugin = createUnplugin<undefined, false>((_options, meta) => ({
      name: 'framework-versions-unloader',
      buildStart() {
        hostVersion = (this as any).meta?.unloaderVersion
        versionsUnloader = meta.versions.unloader
        allVersions = meta.versions
      },
    }))

    const deactivate = registerSync({
      plugins: [plugin.unloader() as any],
    })
    deactivate()

    expect(hostVersion).toBe(unloaderVersion)
    expect(versionsUnloader).toBe(unloaderVersion)
    expect(allVersions).toMatchObject({ unloader: unloaderVersion, unplugin: expect.any(String) })
  })

  it('webpack sets versions.webpack', async () => {
    let hostVersion: string | undefined
    let versionsWebpack: string | undefined
    let allVersions: Partial<Record<string, string>> | undefined
    const plugin = createUnplugin((_options, meta) => ({
      name: 'framework-versions-webpack',
      buildStart() {
        hostVersion = (this.getNativeBuildContext?.() as any)?.compiler?.webpack?.version
        versionsWebpack = meta.versions.webpack
        allVersions = meta.versions
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
    expect(versionsWebpack).toBe(webpackVersion)
    expect(allVersions).toMatchObject({ webpack: webpackVersion, unplugin: expect.any(String) })
  }, 20_000)

  it('rspack sets versions.rspack', async () => {
    let hostVersion: string | undefined
    let versionsRspack: string | undefined
    let allVersions: Partial<Record<string, string>> | undefined
    const plugin = createUnplugin((_options, meta) => ({
      name: 'framework-versions-rspack',
      buildStart() {
        hostVersion = (this.getNativeBuildContext?.() as any)?.compiler?.rspack?.rspackVersion
        versionsRspack = meta.versions.rspack
        allVersions = meta.versions
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
    expect(versionsRspack).toBe(rspackVersion)
    expect(allVersions).toMatchObject({ rspack: rspackVersion, unplugin: expect.any(String) })
  }, 20_000)

  onlyBun('bun sets versions.bun', async () => {
    let hostVersion: string | undefined
    let versionsBun: string | undefined
    let allVersions: Partial<Record<string, string>> | undefined
    const plugin = createUnplugin<undefined, false>((_options, meta) => ({
      name: 'framework-versions-bun',
      buildStart() {
        hostVersion = Bun.version
        versionsBun = meta.versions.bun
        allVersions = meta.versions
      },
    }))

    await build.bun({
      entrypoints: [entry],
      outdir: path.resolve(__dirname, '../filter/test-out/bun-framework-version'),
      plugins: [plugin.bun()],
    })

    expect(hostVersion).toBe(Bun.version)
    expect(versionsBun).toBe(Bun.version)
    expect(allVersions).toMatchObject({ bun: Bun.version, unplugin: expect.any(String) })
  })
})
