import type { NativeBuildContext, UnpluginBuildContext } from '../../../../src/types'
import { resolve } from 'node:path'
import process from 'node:process'
import { assert, describe, expect, it, vi } from 'vitest'
import { getRspackPlugin } from '../../../../src/rspack'
import transform from '../../../../src/rspack/loaders/transform'
import { normalizeObjectHook } from '../../../../src/utils/filter'
import { getWebpackPlugin } from '../../../../src/webpack'
import webpackTransform from '../../../../src/webpack/loaders/transform'

describe('transform', () => {
  it('caches lazy filters per hook and cwd while reading handlers fresh', async () => {
    const originalCwd = process.cwd()
    const firstCwd = resolve(import.meta.dirname, '../../filter/test-src')
    const secondCwd = resolve(import.meta.dirname, '../../resolve-id/test-src')
    try {
      for (const [getPlugin, loader] of [
        [getRspackPlugin, transform],
        [getWebpackPlugin, webpackTransform],
      ] as const) {
        process.chdir(firstCwd)
        let reads = 0
        const filter = {
          id: {
            include: [] as string[],
            exclude: ['not-expect.js'],
          },
          code: { include: 'allowed' },
        }
        const hook = {
          get filter() {
            reads++
            return filter
          },
          handler: (code: string) => `${code}:first`,
        }
        let start: (compilation: any) => Promise<unknown>
        const compiler = {
          options: {
            context: firstCwd,
            module: { rules: [] as any[] },
          },
          rspack: { version: '2.0.0', experiments: {} },
          webpack: { version: '5.0.0' },
          hooks: {
            make: {
              tapPromise(_name: string, callback: typeof start) { start = callback },
            },
          },
        }
        getPlugin(() => ({
          name: 'lazy-filter',
          transform: hook,
          buildStart() { filter.id.include.push('*.js') },
        }))({}).apply(compiler as any)
        expect(reads).toBe(0)
        await start!({
          fileDependencies: new Set(),
        })
        const rule = compiler.options.module.rules[0]
        const accepted = resolve(firstCwd, 'mod.js')
        const invoke = async (id: string, source: string) => {
          const uses = rule.use({ resource: id })
          if (!uses.length)
            return source
          let result: unknown
          await (loader as typeof transform).call({
            query: uses[0].options,
            resource: id,
            async: () => (error: Error | null, code: string) => {
              if (error)
                throw error
              result = code
            },
          } as any, source, undefined)
          return result
        }
        const cases = [
          [accepted, 'allowed', 'allowed:first'],
          [
            resolve(firstCwd, 'not-expect.js'),
            'allowed',
            'allowed',
          ],
          [
            resolve(firstCwd, 'mod.ts'),
            'allowed',
            'allowed',
          ],
          [accepted, 'denied', 'denied'],
        ] as const
        for (const [id, code, expected] of cases) {
          const stock = normalizeObjectHook('transform', { handler: hook.handler, filter }).filter(id, code)
          expect(await invoke(id, code)).toBe(stock
            ? hook.handler(code)
            : code)
          expect(await invoke(id, code)).toBe(expected)
        }
        expect(reads).toBe(2) // One rule filter and one loader filter.
        hook.handler = code => `${code}:second`
        expect(await invoke(accepted, 'allowed')).toBe('allowed:second')
        expect(reads).toBe(2)

        process.chdir(secondCwd)
        expect(await invoke(accepted, 'allowed')).toBe('allowed')
        expect(await invoke(resolve(secondCwd, 'mod.js'), 'allowed')).toBe('allowed:second')
        expect(reads).toBe(4)

        const plugin = rule.use({
          resource: resolve(secondCwd, 'mod.js'),
        })[0].options.plugin
        plugin.transform = {
          filter: { id: '*.ts' },
          handler: () => 'replacement',
        }
        expect(await invoke(resolve(secondCwd, 'mod.js'), 'allowed')).toBe('allowed')
        expect(await invoke(resolve(secondCwd, 'mod.ts'), 'allowed')).toBe('replacement')
      }
    }
    finally {
      process.chdir(originalCwd)
    }
  })

  it('should call callback with source and map if plugin.transform is not defined', async () => {
    const mockCallback = vi.fn()
    const mockLoaderContext = {
      async: () => mockCallback,
      query: {},
    } as any

    const source = 'test source'
    const map = 'test map'

    await transform.call(mockLoaderContext, source, map)

    expect(mockCallback).toHaveBeenCalledWith(null, source, map)
  })

  it('should call callback with an error if handler throws an error', async () => {
    const mockCallback = vi.fn()
    const mockLoaderContext = {
      async: () => mockCallback,
      query: {
        plugin: {
          transform: {
            handler: vi.fn().mockRejectedValue(new Error('Handler error')),
            filter: vi.fn().mockReturnValue(true),
          },
        },
      },
      resource: 'test resource',
    } as any

    const source = 'test source'
    const map = 'test map'

    await transform.call(mockLoaderContext, source, map)

    expect(mockCallback).toHaveBeenCalledWith(expect.any(Error))
    expect(mockCallback.mock.calls[0][0].message).toBe('Handler error')
  })

  it('should call callback with an error if handler throws string', async () => {
    const mockCallback = vi.fn()
    const mockLoaderContext = {
      async: () => mockCallback,
      query: {
        plugin: {
          transform: {
            handler: vi.fn().mockRejectedValue('Handler error'),
            filter: vi.fn().mockReturnValue(true),
          },
        },
      },
      resource: 'test resource',
    } as any

    const source = 'test source'
    const map = 'test map'

    await transform.call(mockLoaderContext, source, map)

    expect(mockCallback).toHaveBeenCalledWith(expect.any(Error))
    expect(mockCallback.mock.calls[0][0].message).toBe('Handler error')
  })

  it('should include input source map on native build context', async () => {
    const source = 'source code'
    const map = 'source map'
    const transformedCode = 'transformed code'
    const transformedMap = 'transformed map'

    let handlerSource: string | undefined
    let handlerId: string | undefined
    let handlerNativeBuildContext: NativeBuildContext | undefined
    const handlerMock = vi.fn().mockImplementation(function (this: UnpluginBuildContext, source: string, id: string) {
      handlerSource = source
      handlerId = id
      handlerNativeBuildContext = this.getNativeBuildContext?.()
      return { code: transformedCode, map: transformedMap }
    })

    const mockCallback = vi.fn()
    const mockLoaderContext = {
      async: () => mockCallback,
      query: {
        plugin: {
          transform: {
            handler: handlerMock,
            filter: vi.fn().mockReturnValue(true),
          },
        },
      },
      resource: 'test resource',
      addDependency: vi.fn(),
      getDependencies: vi.fn().mockReturnValue(['/path/to/dependency']),
      _compiler: {},
      _compilation: {},
    } as any

    await transform.call(mockLoaderContext as any, source, map)

    expect(handlerMock).toHaveBeenCalled()
    expect(handlerSource).toBe(source)
    expect(handlerId).toBe(mockLoaderContext.resource)
    assert(handlerNativeBuildContext?.framework === 'rspack')
    expect(handlerNativeBuildContext?.inputSourceMap).toBe(map)

    expect(mockCallback).toHaveBeenCalledWith(null, transformedCode, transformedMap)
  })
})
