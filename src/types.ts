import type { CompilationContext as FarmCompilationContext, JsPlugin as FarmPlugin } from '@farmfe/core'
import type { Compilation as RspackCompilation, Compiler as RspackCompiler, LoaderContext as RspackLoaderContext, RspackPluginInstance } from '@rspack/core'
import type { BunPlugin, PluginBuilder as BunPluginBuilder } from 'bun'
import type { BuildOptions, Plugin as EsbuildPlugin, Loader, PluginBuild } from 'esbuild'
import type { Plugin as RolldownPlugin } from 'rolldown'
import type { EmittedAsset, PluginContextMeta as RollupContextMeta, Plugin as RollupPlugin, SourceMapInput } from 'rollup'
import type { Plugin as UnloaderPlugin } from 'unloader'
import type { Plugin as VitePlugin } from 'vite'
import type { Compilation as WebpackCompilation, Compiler as WebpackCompiler, LoaderContext as WebpackLoaderContext, WebpackPluginInstance } from 'webpack'
import type VirtualModulesPlugin from 'webpack-virtual-modules'

export type {
  BunPlugin,
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
  file?: string | undefined
  mappings: string
  names: string[]
  sourceRoot?: string | undefined
  sources: string[]
  // In magic-string v0.27.0, `sourcesContent` becomes nullable, while rollup haven't catch up yet
  sourcesContent?: (string | null)[] | undefined
  version: number
}

export type TransformResult = string | { code: string, map?: SourceMapInput | SourceMapCompact | null | undefined } | null | undefined | void

export interface ExternalIdResult { id: string, external?: boolean | undefined }

export type NativeBuildContext
  = { framework: 'webpack', compiler: WebpackCompiler, compilation?: WebpackCompilation | undefined, loaderContext?: WebpackLoaderContext<{ unpluginName: string }> | undefined }
    | { framework: 'esbuild', build: PluginBuild }
    | { framework: 'rspack', compiler: RspackCompiler, compilation: RspackCompilation, loaderContext?: RspackLoaderContext | undefined }
    | { framework: 'farm', context: FarmCompilationContext }
    | { framework: 'bun', build: BunPluginBuilder }

export interface UnpluginBuildContext {
  addWatchFile: (id: string) => void
  emitFile: (emittedFile: EmittedAsset) => void
  getWatchFiles: () => string[]
  parse: (input: string, options?: any) => any
  getNativeBuildContext?: (() => NativeBuildContext) | undefined
}

export type StringOrRegExp = string | RegExp
export type FilterPattern = Arrayable<StringOrRegExp>
export type StringFilter
  = | FilterPattern
    | { include?: FilterPattern | undefined, exclude?: FilterPattern | undefined }
export interface HookFilter {
  id?: StringFilter | undefined
  code?: StringFilter | undefined
}

export interface ObjectHook<T extends HookFnMap[keyof HookFnMap], F extends keyof HookFilter> {
  filter?: Pick<HookFilter, F> | undefined
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
    options: { isEntry: boolean },
  ) => Thenable<string | ExternalIdResult | null | undefined>

  // Output Generation Hooks
  writeBundle: (this: void) => Thenable<void>
}

export interface UnpluginOptions {
  name: string
  enforce?: 'post' | 'pre' | undefined

  buildStart?: HookFnMap['buildStart'] | undefined
  buildEnd?: HookFnMap['buildEnd'] | undefined
  transform?: Hook<HookFnMap['transform'], 'code' | 'id'> | undefined
  load?: Hook<HookFnMap['load'], 'id'> | undefined
  resolveId?: Hook<HookFnMap['resolveId'], 'id'> | undefined
  writeBundle?: HookFnMap['writeBundle'] | undefined

  watchChange?: ((this: UnpluginBuildContext, id: string, change: { event: 'create' | 'update' | 'delete' }) => void) | undefined

  /**
   * Custom predicate function to filter modules to be loaded.
   * When omitted, all modules will be included (might have potential perf impact on Webpack).
   *
   * @deprecated Use `load.filter` instead.
   */
  loadInclude?: ((id: string) => boolean | null | undefined) | undefined
  /**
   * Custom predicate function to filter modules to be transformed.
   * When omitted, all modules will be included (might have potential perf impact on Webpack).
   *
   * @deprecated Use `transform.filter` instead.
   */
  transformInclude?: ((id: string) => boolean | null | undefined) | undefined

  // framework specify extends
  rollup?: Partial<RollupPlugin> | undefined
  webpack?: ((compiler: WebpackCompiler) => void) | undefined
  rspack?: ((compiler: RspackCompiler) => void) | undefined
  vite?: Partial<VitePlugin> | undefined
  unloader?: Partial<UnloaderPlugin> | undefined
  rolldown?: Partial<RolldownPlugin> | undefined
  esbuild?: {
    // using regexp in esbuild improves performance
    onResolveFilter?: RegExp | undefined
    onLoadFilter?: RegExp | undefined
    loader?: Loader | ((code: string, id: string) => Loader) | undefined
    setup?: ((build: PluginBuild) => void | Promise<void>) | undefined
    config?: ((options: BuildOptions) => void) | undefined
  } | undefined
  farm?: Partial<FarmPlugin> | undefined
  bun?: Partial<BunPlugin> | undefined
}

export interface ResolvedUnpluginOptions extends UnpluginOptions {
  // injected internal objects
  __vfs?: VirtualModulesPlugin | undefined
  __vfsModules?: Map<string, Promise<unknown>> | Set<string> | undefined
  __virtualModulePrefix: string
}

export type UnpluginFactory<UserOptions, Nested extends boolean = boolean> = (options: UserOptions, meta: UnpluginContextMeta) =>
Nested extends true
  ? Array<UnpluginOptions>
  : UnpluginOptions
export type UnpluginFactoryOutput<UserOptions, Return> = undefined extends UserOptions
  ? (options?: UserOptions | undefined) => Return
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
  bun: UnpluginFactoryOutput<UserOptions, BunPlugin>
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
  esbuildHostName?: string | undefined
} | {
  framework: 'bun'
  /** Set the host plugin name of bun when returning multiple plugins */
  bunHostName?: string | undefined
} | {
  framework: 'rspack'
  rspack: { compiler: RspackCompiler }
})

export interface UnpluginMessage {
  name?: string | undefined
  id?: string | undefined
  message: string
  stack?: string | undefined
  code?: string | undefined
  plugin?: string | undefined
  pluginCode?: unknown | undefined
  loc?: {
    column: number
    file?: string | undefined
    line: number
  } | undefined
  meta?: any
}

export interface UnpluginContext {
  error: (message: string | UnpluginMessage) => void
  warn: (message: string | UnpluginMessage) => void
}
