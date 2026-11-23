import type { CompilationContext } from '@farmfe/core'
import { describe, expect, it, vi } from 'vitest'
import { createFarmContext, unpluginContext } from '../../../src/farm/context'

describe('createFarmContext', () => {
  it('should create a valid farm context with parse function', () => {
    const mockContext = {
      addWatchFile: vi.fn(),
      emitFile: vi.fn(),
      getWatchFiles: vi.fn().mockReturnValue(['file1', 'file2']),
    } as unknown as CompilationContext

    const farmContext = createFarmContext(mockContext)

    expect(farmContext.parse).toBeDefined()
    expect(farmContext.parse).toBeInstanceOf(Function)
  })

  it('should add a watch file', () => {
    const mockContext = {
      addWatchFile: vi.fn(),
    } as unknown as CompilationContext

    const farmContext = createFarmContext(mockContext)
    farmContext.addWatchFile('test-file')

    expect(mockContext.addWatchFile).toHaveBeenCalledWith('test-file', 'test-file')
  })

  it('should emit a file', () => {
    const mockContext = {
      emitFile: vi.fn(),
    } as unknown as CompilationContext

    const farmContext = createFarmContext(mockContext)
    farmContext.emitFile({
      fileName: 'test-file.js',
      source: 'console.log("test")',
    } as any)

    expect(mockContext.emitFile).toHaveBeenCalledWith({
      resolvedPath: 'test-file.js',
      name: 'test-file.js',
      content: expect.any(Array),
      resourceType: '.js',
    })
  })

  it('should emit a file by name', () => {
    const mockContext = {
      emitFile: vi.fn(),
    } as unknown as CompilationContext

    const farmContext = createFarmContext(mockContext)
    farmContext.emitFile({
      name: 'test-file.js',
      source: 'console.log("test")',
    } as any)

    expect(mockContext.emitFile).toHaveBeenCalledWith({
      resolvedPath: 'test-file.js',
      name: 'test-file.js',
      content: expect.any(Array),
      resourceType: '.js',
    })
  })

  it('should get watch files', () => {
    const mockContext = {
      getWatchFiles: vi.fn().mockReturnValue(['file1', 'file2']),
    } as unknown as CompilationContext

    const farmContext = createFarmContext(mockContext)
    const watchFiles = farmContext.getWatchFiles()

    expect(watchFiles).toEqual(['file1', 'file2'])
  })

  it('should return native build context', () => {
    const mockContext = {} as CompilationContext

    const farmContext = createFarmContext(mockContext)
    const nativeBuildContext = farmContext.getNativeBuildContext!()

    expect(nativeBuildContext).toEqual({ framework: 'farm', context: mockContext })
  })
})

describe('unpluginContext', () => {
  it('should call context.error with a string from an Error object', () => {
    const mockContext = {
      error: vi.fn(),
    } as unknown as CompilationContext

    const pluginContext = unpluginContext(mockContext)
    pluginContext.error(new Error('Test error'))

    expect(mockContext.error).toHaveBeenCalledWith('Test error')
  })

  it('should call context.error with a string message', () => {
    const mockContext = {
      error: vi.fn(),
    } as unknown as CompilationContext

    const pluginContext = unpluginContext(mockContext)
    pluginContext.error('Test error')

    expect(mockContext.error).toHaveBeenCalledWith('Test error')
  })

  it('should call context.error with a string from a message object', () => {
    const mockContext = {
      error: vi.fn(),
    } as unknown as CompilationContext

    const pluginContext = unpluginContext(mockContext)
    pluginContext.error({ message: 'Object error' })

    expect(mockContext.error).toHaveBeenCalledWith('Object error')
  })

  it('should call context.warn with a string from an Error object', () => {
    const mockContext = {
      warn: vi.fn(),
    } as unknown as CompilationContext

    const pluginContext = unpluginContext(mockContext)
    pluginContext.warn(new Error('Test warning'))

    expect(mockContext.warn).toHaveBeenCalledWith('Test warning')
  })

  it('should call context.warn with a string message', () => {
    const mockContext = {
      warn: vi.fn(),
    } as unknown as CompilationContext

    const pluginContext = unpluginContext(mockContext)
    pluginContext.warn('Test warning')

    expect(mockContext.warn).toHaveBeenCalledWith('Test warning')
  })

  it('should call context.warn with a string from a message object', () => {
    const mockContext = {
      warn: vi.fn(),
    } as unknown as CompilationContext

    const pluginContext = unpluginContext(mockContext)
    pluginContext.warn({ message: 'Object warning' })

    expect(mockContext.warn).toHaveBeenCalledWith('Object warning')
  })
})
