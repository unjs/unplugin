import type { AstNode, EmittedAsset, PluginContextMeta as RollupContextMeta, Plugin as RollupPlugin, SourceMapInput } from 'rollup'
import type { Compiler as WebpackCompiler, WebpackPluginInstance } from 'webpack'
import type { Plugin as VitePlugin } from 'vite'
import type { Plugin as RolldownPlugin } from 'rolldown'
import type { BuildOptions, Plugin as EsbuildPlugin, Loader } from 'esbuild'
import type { Compiler as RspackCompiler, RspackPluginInstance } from '@rspack/core'
import type VirtualModulesPlugin from 'webpack-virtual-modules'
import type { JsPlugin as FarmPlugin } from '@farmfe/core'
import type { EsbuildPluginBuild } from './esbuild'

export {
  EsbuildPlugin,
  RollupPlugin,
  RolldownPlugin,
  VitePlugin,
  WebpackPluginInstance,
  RspackPluginInstance,
  RspackCompiler,
  WebpackCompiler,
}

export type Thenable<T> = T | Promise<T>

export interface SourceMapCompact {
  file?: string
  mappings: string
  names: string[]
  sourceRoot?: string
  sources: string[]
  // In magic-string v0.27.0, `sourcesContent` becomes nullable, while rollup haven't catch up yet
  sourcesContent?: (string | null)[]
  version: number
}

export interface JsPluginExtended extends FarmPlugin {
  [key: string]: any
}

export type TransformResult = string | { code: string, map?: SourceMapInput | SourceMapCompact | null } | null | undefined | void

export interface ExternalIdResult { id: string, external?: boolean }

export interface UnpluginBuildContext {
  addWatchFile: (id: string) => void
  emitFile: (emittedFile: EmittedAsset) => void
  getWatchFiles: () => string[]
  parse: (input: string, options?: any) => AstNode
}

export interface UnpluginOptions {
  name: string
  enforce?: 'post' | 'pre' | undefined

  // Build Hooks
  buildStart?: (this: UnpluginBuildContext) => Promise<void> | void
  buildEnd?: (this: UnpluginBuildContext) => Promise<void> | void
  transform?: (this: UnpluginBuildContext & UnpluginContext, code: string, id: string) => Thenable<TransformResult>
  load?: (this: UnpluginBuildContext & UnpluginContext, id: string) => Thenable<TransformResult>
  resolveId?: (this: UnpluginBuildContext & UnpluginContext, id: string, importer: string | undefined, options: { isEntry: boolean }) => Thenable<string | ExternalIdResult | null | undefined>
  watchChange?: (this: UnpluginBuildContext, id: string, change: { event: 'create' | 'update' | 'delete' }) => void

  // Output Generation Hooks
  writeBundle?: (this: void) => Promise<void> | void

  /**
   * Custom predicate function to filter modules to be loaded.
   * When omitted, all modules will be included (might have potential perf impact on Webpack).
   */
  loadInclude?: (id: string) => boolean | null | undefined
  /**
   * Custom predicate function to filter modules to be transformed.
   * When omitted, all modules will be included (might have potential perf impact on Webpack).
   */
  transformInclude?: (id: string) => boolean | null | undefined

  // framework specify extends
  rollup?: Partial<RollupPlugin>
  webpack?: (compiler: WebpackCompiler) => void
  rspack?: (compiler: RspackCompiler) => void
  vite?: Partial<VitePlugin>
  rolldown?: Partial<RolldownPlugin>
  esbuild?: {
    // using regexp in esbuild improves performance
    onResolveFilter?: RegExp
    onLoadFilter?: RegExp
    setup?: (build: EsbuildPluginBuild) => void | Promise<void>
    loader?: Loader | ((code: string, id: string) => Loader)
    config?: (options: BuildOptions) => void
  }
  farm?: Partial<FarmPlugin>
}

export interface ResolvedUnpluginOptions extends UnpluginOptions {
  // injected internal objects
  __vfs?: VirtualModulesPlugin
  __vfsModules?: Set<string>
  __virtualModulePrefix: string
}

export type UnpluginFactory<UserOptions, Nested extends boolean = boolean> = (options: UserOptions, meta: UnpluginContextMeta) =>
Nested extends true
  ? Array<UnpluginOptions>
  : UnpluginOptions
export type UnpluginFactoryOutput<UserOptions, Return> = undefined extends UserOptions
  ? (options?: UserOptions) => Return
  : (options: UserOptions) => Return

export interface UnpluginInstance<UserOptions, Nested extends boolean = boolean> {
  rollup: UnpluginFactoryOutput<UserOptions, Nested extends true ? Array<RollupPlugin> : RollupPlugin>
  vite: UnpluginFactoryOutput<UserOptions, Nested extends true ? Array<VitePlugin> : VitePlugin>
  rolldown: UnpluginFactoryOutput<UserOptions, Nested extends true ? Array<RolldownPlugin> : RolldownPlugin>
  webpack: UnpluginFactoryOutput<UserOptions, WebpackPluginInstance>
  rspack: UnpluginFactoryOutput<UserOptions, RspackPluginInstance>
  esbuild: UnpluginFactoryOutput<UserOptions, EsbuildPlugin>
  farm: UnpluginFactoryOutput<UserOptions, FarmPlugin>
  raw: UnpluginFactory<UserOptions, Nested>
}

export type UnpluginContextMeta = Partial<RollupContextMeta> & ({
  framework: 'rollup' | 'vite' | 'rolldown'
} | {
  framework: 'webpack'
  webpack: {
    compiler: WebpackCompiler
  }
} | {
  framework: 'esbuild'
  build?: EsbuildPluginBuild
  /** Set the host plugin name of esbuild when returning multiple plugins */
  esbuildHostName?: string
} | {
  framework: 'rspack'
  rspack: {
    compiler: RspackCompiler
  }
} | {
  framework: 'farm'
})

export interface UnpluginMessage {
  name?: string
  id?: string
  message: string
  stack?: string
  code?: string
  plugin?: string
  pluginCode?: unknown
  loc?: {
    column: number
    file?: string
    line: number
  }
  meta?: any
}

export interface UnpluginContext {
  error: (message: string | UnpluginMessage) => void
  warn: (message: string | UnpluginMessage) => void
}

declare module 'webpack' {
  interface Compiler {
    $unpluginContext: Record<string, ResolvedUnpluginOptions>
  }
}

declare module '@rspack/core' {
  interface Compiler {
    $unpluginContext: Record<string, ResolvedUnpluginOptions>
  }
}
