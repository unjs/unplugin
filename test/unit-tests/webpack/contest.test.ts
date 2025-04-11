import type { Compilation, Compiler, LoaderContext } from 'webpack'
import { describe, expect, it, vi } from 'vitest'
import { contextOptionsFromCompilation, createBuildContext, createContext, normalizeMessage } from '../../../src/webpack/context'

describe('webpack - utils', () => {
  describe('contextOptionsFromCompilation', () => {
    it('should add and retrieve watch files', () => {
      const mockCompilation = {
        fileDependencies: new Set<string>(),
      } as unknown as Compilation

      const contextOptions = contextOptionsFromCompilation(mockCompilation)
      contextOptions.addWatchFile('test-file.js')
      expect(contextOptions.getWatchFiles()).toContain('test-file.js')
    })

    it('should add and retrieve compilation dependencies', () => {
      const mockCompilation = {
        compilationDependencies: new Set<string>(),
      } as unknown as Compilation

      const contextOptions = contextOptionsFromCompilation(mockCompilation)
      contextOptions.addWatchFile('test-file.js')
      expect(contextOptions.getWatchFiles()).toContain('test-file.js')
    })
  })

  describe('createBuildContext', () => {
    it('should add watch files and emit assets', () => {
      const mockOptions = {
        addWatchFile: vi.fn(),
        getWatchFiles: vi.fn(() => ['file1.js']),
      }
      const mockCompiler = {} as Compiler
      const mockCompilation = {
        emitAsset: vi.fn(),
      } as unknown as Compilation

      const buildContext = createBuildContext(mockOptions, mockCompiler, mockCompilation)
      buildContext.addWatchFile('file2.js')
      expect(mockOptions.addWatchFile).toHaveBeenCalledWith(expect.stringContaining('file2.js'))

      buildContext.emitFile({ fileName: 'output.js', source: 'content' } as any)
      expect(mockCompilation.emitAsset).toHaveBeenCalledWith(
        'output.js',
        expect.anything(),
      )
    })
  })

  describe('createContext', () => {
    it('should emit errors and warnings', () => {
      const mockLoader = {
        emitError: vi.fn(),
        emitWarning: vi.fn(),
      } as unknown as LoaderContext<{ unpluginName: string }>

      const context = createContext(mockLoader)
      context.error('Test error')
      context.warn('Test warning')

      expect(mockLoader.emitError).toHaveBeenCalledWith(expect.any(Error))
      expect(mockLoader.emitWarning).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('normalizeMessage', () => {
    it('should normalize string messages', () => {
      const error = normalizeMessage('Test error')
      expect(error.message).toBe('Test error')
    })

    it('should normalize object messages', () => {
      const error = normalizeMessage({ message: 'Test error', stack: 'stack trace', meta: 'meta info' })
      expect(error.message).toBe('Test error')
      expect(error.stack).toBe('stack trace')
      expect(error.cause).toBe('meta info')
    })
  })
})
