import type { CompilationContext as FarmCompilationContext, JsPlugin as FarmPlugin } from '@farmfe/core'
import type { Compilation as RspackCompilation, Compiler as RspackCompiler, LoaderContext as RspackLoaderContext, RspackPluginInstance } from '@rspack/core'
import type { BuildOptions, Plugin as EsbuildPlugin, Loader, PluginBuild } from 'esbuild'
import type { Plugin as RolldownPlugin } from 'rolldown'
import type { AstNode, EmittedAsset, PluginContextMeta as RollupContextMeta, Plugin as RollupPlugin, SourceMapInput } from 'rollup'
import type { Plugin as UnloaderPlugin } from 'unloader'
import type { Plugin as VitePlugin } from 'vite'
import type { Compilation as WebpackCompilation, Compiler as WebpackCompiler, LoaderContext as WebpackLoaderContext, WebpackPluginInstance } from 'webpack'
import type VirtualModulesPlugin from 'webpack-virtual-modules'

export type {
  EsbuildPlugin,
  RolldownPlugin,
  RollupPlugin,
  RspackCompiler,
  RspackPluginInstance,
  UnloaderPlugin,
  VitePlugin,
  WebpackCompiler,
  WebpackPluginInstance,
}

export type Thenable<T> = T | Promise<T>

/**
 * Null or whatever
 */
export type Nullable<T> = T | null | undefined

/**
 * Array, or not yet
 */
export type Arrayable<T> = T | Array<T>

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

export type TransformResult = string | { code: string, map?: SourceMapInput | SourceMapCompact | null } | null | undefined | void

export interface ExternalIdResult { id: string, external?: boolean }

export type NativeBuildContext =
  { framework: 'webpack', compiler: WebpackCompiler, compilation?: WebpackCompilation, loaderContext?: WebpackLoaderContext<{ unpluginName: string }> } |
  { framework: 'esbuild', build: PluginBuild } |
  { framework: 'rspack', compiler: RspackCompiler, compilation: RspackCompilation, loaderContext?: RspackLoaderContext } |
  { framework: 'farm', context: FarmCompilationContext }

export interface UnpluginBuildContext {
  addWatchFile: (id: string) => void
  emitFile: (emittedFile: EmittedAsset) => void
  getWatchFiles: () => string[]
  parse: (input: string, options?: any) => AstNode
  getNativeBuildContext?: () => NativeBuildContext
}

export type StringOrRegExp = string | RegExp
export type StringFilter =
  | Arrayable<StringOrRegExp>
  | { include?: Arrayable<StringOrRegExp>, exclude?: Arrayable<StringOrRegExp> }
export interface HookFilter {
  id?: StringFilter
  code?: StringFilter
}

export interface ObjectHook<T extends HookFnMap[keyof HookFnMap], F extends keyof HookFilter> {
  filter?: Pick<HookFilter, F>
  handler: T
}
export type Hook<
  T extends HookFnMap[keyof HookFnMap],
  F extends keyof HookFilter,
> = T | ObjectHook<T, F>

export interface HookFnMap {
  // Build Hooks
  buildStart: (this: UnpluginBuildContext) => Thenable<void>
  buildEnd: (this: UnpluginBuildContext) => Thenable<void>

  transform: (this: UnpluginBuildContext & UnpluginContext, code: string, id: string) => Thenable<TransformResult>
  load: (this: UnpluginBuildContext & UnpluginContext, id: string) => Thenable<TransformResult>
  resolveId: (
    this: UnpluginBuildContext & UnpluginContext,
    id: string,
    importer: string | undefined,
    options: { isEntry: boolean }
  ) => Thenable<string | ExternalIdResult | null | undefined>

  // Output Generation Hooks
  writeBundle: (this: void) => Thenable<void>
}

export interface UnpluginOptions {
  name: string
  enforce?: 'post' | 'pre' | undefined

  buildStart?: HookFnMap['buildStart']
  buildEnd?: HookFnMap['buildEnd']
  transform?: Hook<HookFnMap['transform'], 'code' | 'id'>
  load?: Hook<HookFnMap['load'], 'id'>
  resolveId?: Hook<HookFnMap['resolveId'], 'id'>
  writeBundle?: HookFnMap['writeBundle']

  watchChange?: (this: UnpluginBuildContext, id: string, change: { event: 'create' | 'update' | 'delete' }) => void

  /**
   * Custom predicate function to filter modules to be loaded.
   * When omitted, all modules will be included (might have potential perf impact on Webpack).
   *
   * @deprecated Use `load.filter` instead.
   */
  loadInclude?: (id: string) => boolean | null | undefined
  /**
   * Custom predicate function to filter modules to be transformed.
   * When omitted, all modules will be included (might have potential perf impact on Webpack).
   *
   * @deprecated Use `transform.filter` instead.
   */
  transformInclude?: (id: string) => boolean | null | undefined

  // framework specify extends
  rollup?: Partial<RollupPlugin>
  webpack?: (compiler: WebpackCompiler) => void
  rspack?: (compiler: RspackCompiler) => void
  vite?: Partial<VitePlugin>
  unloader?: Partial<UnloaderPlugin>
  rolldown?: Partial<RolldownPlugin>
  esbuild?: {
    // using regexp in esbuild improves performance
    onResolveFilter?: RegExp
    onLoadFilter?: RegExp
    loader?: Loader | ((code: string, id: string) => Loader)
    setup?: (build: PluginBuild) => void | Promise<void>
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
  unloader: UnpluginFactoryOutput<UserOptions, Nested extends true ? Array<UnloaderPlugin> : UnloaderPlugin>
  farm: UnpluginFactoryOutput<UserOptions, FarmPlugin>
  raw: UnpluginFactory<UserOptions, Nested>
}

export type UnpluginContextMeta = Partial<RollupContextMeta> & ({
  framework: 'rollup' | 'vite' | 'rolldown' | 'farm' | 'unloader'
} | {
  framework: 'webpack'
  webpack: { compiler: WebpackCompiler }
} | {
  framework: 'esbuild'
  /** Set the host plugin name of esbuild when returning multiple plugins */
  esbuildHostName?: string
} | {
  framework: 'rspack'
  rspack: { compiler: RspackCompiler }
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
