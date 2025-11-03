import type { PluginBuilder } from 'bun'
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createBuildContext,
  createPluginContext,
} from '../../../src/bun/utils'

vi.mock('node:fs')
vi.mock('node:path')

describe('bun utils', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createBuildContext', () => {
    it('should create build context with all required methods', () => {
      const mockBuild = { config: { outdir: '/path/to/outdir' } }
      const context = createBuildContext(mockBuild as PluginBuilder)

      expect(context.addWatchFile).toBeInstanceOf(Function)
      expect(context.getWatchFiles).toBeInstanceOf(Function)
      expect(context.emitFile).toBeInstanceOf(Function)
      expect(context.parse).toBeInstanceOf(Function)
      expect(context.getNativeBuildContext).toBeInstanceOf(Function)
    })

    it('should handle addWatchFile and getWatchFiles', () => {
      const mockBuild = { config: { outdir: '/path/to/outdir' } }
      const context = createBuildContext(mockBuild as PluginBuilder)

      expect(context.getWatchFiles()).toEqual([])

      context.addWatchFile('file1.js')
      context.addWatchFile('file2.js')

      expect(context.getWatchFiles()).toEqual(['file1.js', 'file2.js'])
    })

    it('should emit file with fileName', () => {
      const mockExistsSync = vi.mocked(fs.existsSync)
      const mockWriteFileSync = vi.mocked(fs.writeFileSync)
      const mockResolve = vi.mocked(path.resolve)
      const mockDirname = vi.mocked(path.dirname)

      mockExistsSync.mockReturnValue(true)
      mockResolve.mockReturnValue('/path/to/outdir/output.js')
      mockDirname.mockReturnValue('/path/to/outdir')

      const mockBuild = { config: { outdir: '/path/to/outdir' } }
      const context = createBuildContext(mockBuild as PluginBuilder)

      context.emitFile({
        type: 'asset',
        fileName: 'output.js',
        source: 'console.log("hello")',
      } as any)

      expect(mockResolve).toHaveBeenCalledWith('/path/to/outdir', 'output.js')
      expect(mockDirname).toHaveBeenCalledWith('/path/to/outdir/output.js')
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/path/to/outdir/output.js',
        'console.log("hello")',
      )
    })

    it('should emit file with name when fileName is not provided', () => {
      const mockExistsSync = vi.mocked(fs.existsSync)
      const mockWriteFileSync = vi.mocked(fs.writeFileSync)
      const mockResolve = vi.mocked(path.resolve)
      const mockDirname = vi.mocked(path.dirname)

      mockExistsSync.mockReturnValue(true)
      mockResolve.mockReturnValue('/path/to/outdir/output.js')
      mockDirname.mockReturnValue('/path/to/outdir')

      const mockBuild = { config: { outdir: '/path/to/outdir' } }
      const context = createBuildContext(mockBuild as PluginBuilder)

      context.emitFile({
        type: 'asset',
        name: 'output.js',
        source: 'console.log("hello")',
      } as any)

      expect(mockResolve).toHaveBeenCalledWith('/path/to/outdir', 'output.js')
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/path/to/outdir/output.js',
        'console.log("hello")',
      )
    })

    it('should create directory if it does not exist when emitting file', () => {
      const mockExistsSync = vi.mocked(fs.existsSync)
      const mockMkdirSync = vi.mocked(fs.mkdirSync)
      const mockWriteFileSync = vi.mocked(fs.writeFileSync)
      const mockResolve = vi.mocked(path.resolve)
      const mockDirname = vi.mocked(path.dirname)

      mockExistsSync.mockReturnValue(false)
      mockResolve.mockReturnValue('/path/to/outdir/nested/output.js')
      mockDirname.mockReturnValue('/path/to/outdir/nested')

      const mockBuild = { config: { outdir: '/path/to/outdir' } }
      const context = createBuildContext(mockBuild as PluginBuilder)

      context.emitFile({
        type: 'asset',
        fileName: 'nested/output.js',
        source: 'console.log("hello")',
      } as any)

      expect(mockMkdirSync).toHaveBeenCalledWith('/path/to/outdir/nested', { recursive: true })
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/path/to/outdir/nested/output.js',
        'console.log("hello")',
      )
    })

    it('should handle Buffer source when emitting file', () => {
      const mockExistsSync = vi.mocked(fs.existsSync)
      const mockWriteFileSync = vi.mocked(fs.writeFileSync)
      const mockResolve = vi.mocked(path.resolve)
      const mockDirname = vi.mocked(path.dirname)

      mockExistsSync.mockReturnValue(true)
      mockResolve.mockReturnValue('/path/to/outdir/output.bin')
      mockDirname.mockReturnValue('/path/to/outdir')

      const mockBuild = { config: { outdir: '/path/to/outdir' } }
      const context = createBuildContext(mockBuild as PluginBuilder)
      const bufferSource = Buffer.from('binary data')

      context.emitFile({
        type: 'asset',
        fileName: 'output.bin',
        source: bufferSource,
      } as any)

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/path/to/outdir/output.bin',
        bufferSource,
      )
    })

    it('should not emit file when source is missing', () => {
      const mockWriteFileSync = vi.mocked(fs.writeFileSync)

      const mockBuild = { config: { outdir: '/path/to/outdir' } }
      const context = createBuildContext(mockBuild as PluginBuilder)

      context.emitFile({
        type: 'asset',
        fileName: 'output.js',
      } as any)

      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })

    it('should not emit file when both fileName and name are missing', () => {
      const mockWriteFileSync = vi.mocked(fs.writeFileSync)

      const mockBuild = { config: { outdir: '/path/to/outdir' } }
      const context = createBuildContext(mockBuild as PluginBuilder)

      context.emitFile({
        type: 'asset',
        source: 'console.log("hello")',
      } as any)

      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })

    it('should not emit file when outdir is not configured', () => {
      const mockWriteFileSync = vi.mocked(fs.writeFileSync)

      const mockBuild = { config: {} }
      const context = createBuildContext(mockBuild as PluginBuilder)

      context.emitFile({
        type: 'asset',
        fileName: 'output.js',
        source: 'console.log("hello")',
      } as any)

      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })

    it('should parse code with acorn', () => {
      const mockBuild = { config: { outdir: '/path/to/outdir' } }
      const context = createBuildContext(mockBuild as PluginBuilder)

      const ast = context.parse('const x = 1')
      expect(ast).toBeDefined()
      expect(ast.type).toBe('Program')
      expect((ast as any).body).toHaveLength(1)
      expect((ast as any).body[0].type).toBe('VariableDeclaration')
    })

    it('should parse code with custom options', () => {
      const mockBuild = { config: { outdir: '/path/to/outdir' } }
      const context = createBuildContext(mockBuild as PluginBuilder)

      const ast = context.parse('const x = 1', {
        sourceType: 'script',
        ecmaVersion: 2015,
      })
      expect(ast).toBeDefined()
      expect(ast.type).toBe('Program')
    })

    it('should return native build context', () => {
      const mockBuild = { config: { outdir: '/path/to/outdir' } }
      const context = createBuildContext(mockBuild as PluginBuilder)

      const nativeContext = context.getNativeBuildContext!()
      expect(nativeContext).toEqual({
        framework: 'bun',
        build: mockBuild,
      })
    })
  })

  describe('createPluginContext', () => {
    it('should create plugin context with error and warn methods', () => {
      const mockBuild = { config: { outdir: '/path/to/outdir' } }
      const buildContext = createBuildContext(mockBuild as PluginBuilder)
      const pluginContext = createPluginContext(buildContext)

      expect(pluginContext.errors).toEqual([])
      expect(pluginContext.warnings).toEqual([])
      expect(pluginContext.mixedContext).toBeDefined()
      expect(pluginContext.mixedContext.error).toBeInstanceOf(Function)
      expect(pluginContext.mixedContext.warn).toBeInstanceOf(Function)
    })

    it('should collect errors when error is called', () => {
      const mockBuild = { config: { outdir: '/path/to/outdir' } }
      const buildContext = createBuildContext(mockBuild as PluginBuilder)
      const pluginContext = createPluginContext(buildContext)

      pluginContext.mixedContext.error('Error message')
      expect(pluginContext.errors).toHaveLength(1)
      expect(pluginContext.errors[0]).toBe('Error message')

      pluginContext.mixedContext.error('Another error')
      expect(pluginContext.errors).toHaveLength(2)
      expect(pluginContext.errors[1]).toBe('Another error')
    })

    it('should collect warnings when warn is called', () => {
      const mockBuild = { config: { outdir: '/path/to/outdir' } }
      const buildContext = createBuildContext(mockBuild as PluginBuilder)
      const pluginContext = createPluginContext(buildContext)

      pluginContext.mixedContext.warn('Warning message')
      expect(pluginContext.warnings).toHaveLength(1)
      expect(pluginContext.warnings[0]).toBe('Warning message')

      pluginContext.mixedContext.warn('Another warning')
      expect(pluginContext.warnings).toHaveLength(2)
      expect(pluginContext.warnings[1]).toBe('Another warning')
    })

    it('should include build context methods in mixed context', () => {
      const mockBuild = { config: { outdir: '/path/to/outdir' } }
      const buildContext = createBuildContext(mockBuild as PluginBuilder)
      const pluginContext = createPluginContext(buildContext)

      expect(pluginContext.mixedContext.addWatchFile).toBeInstanceOf(Function)
      expect(pluginContext.mixedContext.getWatchFiles).toBeInstanceOf(Function)
      expect(pluginContext.mixedContext.emitFile).toBeInstanceOf(Function)
      expect(pluginContext.mixedContext.parse).toBeInstanceOf(Function)
    })

    it('should handle complex error objects', () => {
      const mockBuild = { config: { outdir: '/path/to/outdir' } }
      const buildContext = createBuildContext(mockBuild as PluginBuilder)
      const pluginContext = createPluginContext(buildContext)

      const errorObj = {
        message: 'Complex error',
        code: 'ERR_001',
        stack: 'Error stack trace',
      }

      pluginContext.mixedContext.error(errorObj)
      expect(pluginContext.errors).toHaveLength(1)
      expect(pluginContext.errors[0]).toEqual(errorObj)
    })
  })
})
