import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import {
  combineSourcemaps,
  createPluginContext,
  fixSourceMap,
  guessLoader,
  processCodeWithSourceMap,
  unwrapLoader,
} from '../../../src/esbuild/utils'

describe('utils', () => {
  describe('guessLoader', () => {
    it('should return expected', () => {
      const actual = guessLoader('js', 'test.js')
      expect(actual).toEqual('js')
    })
  })

  describe('unwrapLoader', () => {
    it('when loader is Loader,  should return expected', () => {
      const actual = unwrapLoader('base64', 'code', 'id')
      expect(actual).toEqual('base64')
    })
    it('when loader is function,  should return expected', () => {
      const loader = vi.fn().mockReturnValue('base64')
      const actual = unwrapLoader(loader, 'code', 'id')

      expect(loader).toHaveBeenCalledOnce()
      expect(loader).toHaveBeenCalledWith('code', 'id')
      expect(actual).toEqual('base64')
    })
  })

  describe('fixSourceMap', () => {
    it('when encodedSourceMap does not has toString() and toUrl(), should return expected', () => {
      const actual = fixSourceMap({
        mappings: '',
        names: [],
        sources: [],
        version: 3,
      })
      expect(actual.toString).toBeInstanceOf(Function)
      expect(actual.toUrl).toBeInstanceOf(Function)

      const actualString = actual.toString()
      expect(actualString).toEqual(JSON.stringify(actual))

      const actualUrl = actual.toUrl()
      expect(actualUrl).toEqual(
        `data:application/json;charset=utf-8;base64,${Buffer.from(actualString).toString('base64')}`,
      )
    })
  })

  describe('combineSourcemaps', () => {
    it('when combineSourcemaps is empty, should return expected', () => {
      const actual = combineSourcemaps('filename', [])
      expect(actual).toEqual({
        names: [],
        sources: [],
        mappings: '',
        version: 3,
      })
    })

    it('when combineSourcemaps has sources, should return expected', () => {
      const actual = combineSourcemaps('filename', [
        {
          names: [],
          sources: ['source1'],
          mappings: 'AAAA',
          version: 3,
        },
        {
          names: [],
          sources: ['source2'],
          mappings: 'AAAA',
          version: 3,
        },
      ])
      expect(actual).toEqual({
        names: [],
        ignoreList: [],
        sourceRoot: undefined,
        sources: ['source2'],
        mappings: 'AAAA',
        version: 3,
      })
    })

    it('when combineSourcemaps not use array interface, should return expected', () => {
      const actual = combineSourcemaps('filename', [
        {
          names: [],
          sources: ['source1', 'source2'],
          mappings: 'AAAA',
          version: 3,
        },
        {
          names: [],
          sources: [],
          mappings: '',
          version: 3,
        },
      ])
      expect(actual).toEqual({
        ignoreList: [],
        sourceRoot: undefined,
        names: [],
        sources: [],
        mappings: '',
        version: 3,
      })
    })
  })

  describe('createBuildContext', async () => {
    it('should return expected', async () => {
      const { createBuildContext } = await import('../../../src/esbuild/utils')
      const actual = createBuildContext({ initialOptions: { outdir: '/path/to' } } as any)
      expect(actual.parse).toBeInstanceOf(Function)
      expect(actual.emitFile).toBeInstanceOf(Function)
      expect(actual.addWatchFile).toBeInstanceOf(Function)
      expect(actual.getNativeBuildContext).toBeInstanceOf(Function)

      expect(actual.getNativeBuildContext!()).toEqual({
        framework: 'esbuild',
        build: { initialOptions: { outdir: '/path/to' } },
      })
      expect(() => actual.addWatchFile('id')).toThrow(
        'unplugin/esbuild: addWatchFile outside supported hooks (resolveId, load, transform)',
      )
    })
  })

  describe('createPluginContext', () => {
    it('should return expected', () => {
      const watchFiles: any = []
      const actual = createPluginContext({ getWatchFiles: () => watchFiles } as any)
      expect(actual.errors).toBeInstanceOf(Array)
      expect(actual.warnings).toBeInstanceOf(Array)
      expect(actual.mixedContext).toBeInstanceOf(Object)
      expect(actual.mixedContext.addWatchFile).toBeInstanceOf(Function)
      expect(actual.mixedContext.error).toBeInstanceOf(Function)
      expect(actual.mixedContext.warn).toBeInstanceOf(Function)

      actual.mixedContext.addWatchFile('id')
      expect(watchFiles).toContain('id')

      actual.mixedContext.error('error')
      expect(actual.errors).toHaveLength(1)
      expect(actual.errors[0].text).toEqual('error')
      actual.mixedContext.warn('warn')
      expect(actual.warnings).toHaveLength(1)
      expect(actual.warnings[0].text).toEqual('warn')

      actual.mixedContext.error({
        id: '1',
        message: 'message',
        stack: 'stack',
        code: 'code',
        plugin: 'plugin',
        loc: {
          column: 2,
          file: 'file',
          line: 2,
        },
        meta: 'meta',
      })
      expect(actual.errors).toHaveLength(2)
      expect(actual.errors[1]).toEqual({
        id: '1',
        pluginName: 'plugin',
        text: 'message',
        location: {
          file: 'file',
          line: 2,
          column: 2,
        },
        detail: 'meta',
        notes: [],
      })

      actual.mixedContext.warn({
        id: '2',
        message: 'message',
        stack: 'stack',
        code: 'code',
        plugin: 'plugin',
        meta: 'meta',
      })
      expect(actual.warnings).toHaveLength(2)
      expect(actual.warnings[1]).toEqual({
        id: '2',
        pluginName: 'plugin',
        text: 'message',
        location: null,
        detail: 'meta',
        notes: [],
      })
    })
  })

  describe('processCodeWithSourceMap', () => {
    it('when map is null, should return expected', () => {
      const actual = processCodeWithSourceMap(null, 'code')
      expect(actual).toEqual('code')
    })

    it('when map is not null, should return expected', () => {
      const actual = processCodeWithSourceMap({ file: 'file', names: ['name'], sources: ['source'], sourcesContent: ['content'], version: 0 } as any, 'code')
      expect(actual).toEqual('code\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJmaWxlIjoiZmlsZSIsIm5hbWVzIjpbIm5hbWUiXSwic291cmNlcyI6WyJzb3VyY2UiXSwic291cmNlc0NvbnRlbnQiOlsiY29udGVudCJdLCJ2ZXJzaW9uIjowfQ==')
    })
  })
})
