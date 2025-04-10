import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { createBuildContext, createContext } from '../../../src/rspack/context'

describe('createBuildContext', () => {
  it('getNativeBuildContext - should return expected', () => {
    const compiler = { name: 'testCompiler' }
    const compilation = { name: 'testCompilation' }
    const loaderContext = { name: 'testLoaderContext' }

    const buildContext = createBuildContext(compiler as any, compilation as any, loaderContext as any)

    expect(buildContext.getNativeBuildContext!()).toEqual({
      framework: 'rspack',
      compiler,
      compilation,
      loaderContext,
    })
  })

  it('addWatchFile/getWatchFiles - should return expected', () => {
    const compiler = { name: 'testCompiler' }
    const compilation = {
      name: 'testCompilation',
      fileDependencies: new Set(),
    }
    const loaderContext = { name: 'testLoaderContext' }

    const buildContext = createBuildContext(compiler as any, compilation as any, loaderContext as any)
    const filePath = '/fixture/test'

    buildContext.addWatchFile(filePath)

    expect(compilation.fileDependencies.has(filePath)).toBe(true)
    expect(buildContext.getWatchFiles()[0]).toBe(filePath)
  })

  it('emitFile - should return expected', () => {
    const emitAssetMock = vi.fn()
    const RawSourceMock = vi.fn(content => ({ content }))
    const compiler = { name: 'testCompiler' }
    const compilation = {
      name: 'testCompilation',
      compiler: {
        webpack: {
          sources: {
            RawSource: RawSourceMock,
          },
        },
      },
      emitAsset: emitAssetMock,
    }
    const loaderContext = { name: 'testLoaderContext' }

    const buildContext = createBuildContext(compiler as any, compilation as any, loaderContext as any)

    buildContext.emitFile({
      fileName: 'testFile.js',
      source: 'testSource',
    } as any)
    expect(emitAssetMock).toHaveBeenCalledWith(
      'testFile.js',
      {
        content: 'testSource',
      },
    )
    emitAssetMock.mockClear()

    buildContext.emitFile({
      name: 'testFile.js',
      source: Buffer.from('testBufferSource'),
    } as any)
    expect(emitAssetMock).toHaveBeenCalledWith(
      'testFile.js',
      {
        content: Buffer.from('testBufferSource'),
      },
    )
    emitAssetMock.mockClear()
  })

  it('createContext - should return expected', () => {
    const loaderContext = {
      emitError: vi.fn(),
      emitWarning: vi.fn(),
    }

    const context = createContext(loaderContext as any)

    context.error('testError')
    expect(loaderContext.emitError).toHaveBeenCalledWith(new Error('testError'))

    context.error({ message: 'testError' })
    expect(loaderContext.emitError).toHaveBeenCalledWith(new Error('testError'))

    context.warn('testWarning')
    expect(loaderContext.emitWarning).toHaveBeenCalledWith(new Error('testWarning'))
  })
})
