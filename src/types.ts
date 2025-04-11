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
  file?: undefined | string
  mappings: string
  names: string[]
  sourceRoot?: undefined | string
  sources: string[]
  // In magic-string v0.27.0, `sourcesContent` becomes nullable, while rollup haven't catch up yet
  sourcesContent?: undefined | (string | null)[]
  version: number
}

export type TransformResult = string | { code: string, map?: undefined | SourceMapInput | SourceMapCompact | null } | null | undefined | void

export interface ExternalIdResult { id: string, external?: undefined | boolean }

export type NativeBuildContext =
  { framework: 'webpack', compiler: WebpackCompiler, compilation?: undefined | WebpackCompilation, loaderContext?: undefined | WebpackLoaderContext<{ unpluginName: string }> } |
  { framework: 'esbuild', build: PluginBuild } |
  { framework: 'rspack', compiler: RspackCompiler, compilation: RspackCompilation, loaderContext?: undefined | RspackLoaderContext } |
  { framework: 'farm', context: FarmCompilationContext }

export interface UnpluginBuildContext {
  addWatchFile: (id: string) => void
  emitFile: (emittedFile: EmittedAsset) => void
  getWatchFiles: () => string[]
  parse: (input: string, options?: any) => AstNode
  getNativeBuildContext?: undefined | (() => NativeBuildContext)
}

export type StringOrRegExp = string | RegExp
export type FilterPattern = Arrayable<StringOrRegExp>
export type StringFilter =
  | FilterPattern
  | { include?: undefined | FilterPattern, exclude?: undefined | FilterPattern }
export interface HookFilter {
  id?: undefined | StringFilter
  code?: undefined | StringFilter
}

export interface ObjectHook<T extends HookFnMap[keyof HookFnMap], F extends keyof HookFilter> {
  filter?: undefined | Pick<HookFilter, F>
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
  enforce?: undefined | 'post' | 'pre'

  buildStart?: undefined | HookFnMap['buildStart']
  buildEnd?: undefined | HookFnMap['buildEnd']
  transform?: undefined | Hook<HookFnMap['transform'], 'code' | 'id'>
  load?: undefined | Hook<HookFnMap['load'], 'id'>
  resolveId?: undefined | Hook<HookFnMap['resolveId'], 'id'>
  writeBundle?: undefined | HookFnMap['writeBundle']

  watchChange?: undefined | ((this: UnpluginBuildContext, id: string, change: { event: 'create' | 'update' | 'delete' }) => void)

  /**
   * Custom predicate function to filter modules to be loaded.
   * When omitted, all modules will be included (might have potential perf impact on Webpack).
   *
   * @deprecated Use `load.filter` instead.
   */
  loadInclude?: undefined | ((id: string) => boolean | null | undefined)
  /**
   * Custom predicate function to filter modules to be transformed.
   * When omitted, all modules will be included (might have potential perf impact on Webpack).
   *
   * @deprecated Use `transform.filter` instead.
   */
  transformInclude?: undefined | ((id: string) => boolean | null | undefined)

  // framework specify extends
  rollup?: undefined | Partial<RollupPlugin>
  webpack?: undefined | ((compiler: WebpackCompiler) => void)
  rspack?: undefined | ((compiler: RspackCompiler) => void)
  vite?: undefined | Partial<VitePlugin>
  unloader?: undefined | Partial<UnloaderPlugin>
  rolldown?: undefined | Partial<RolldownPlugin>
  esbuild?: undefined | {
    // using regexp in esbuild improves performance
    onResolveFilter?: undefined | RegExp
    onLoadFilter?: undefined | RegExp
    loader?: undefined | Loader | ((code: string, id: string) => Loader)
    setup?: undefined | ((build: PluginBuild) => void | Promise<void>)
    config?: undefined | ((options: BuildOptions) => void)
  }
  farm?: undefined | Partial<FarmPlugin>
}

export interface ResolvedUnpluginOptions extends UnpluginOptions {
  // injected internal objects
  __vfs?: undefined | VirtualModulesPlugin
  __vfsModules?: undefined | Set<string>
  __virtualModulePrefix: string
}

export type UnpluginFactory<UserOptions, Nested extends boolean = boolean> = (options: UserOptions, meta: UnpluginContextMeta) =>
Nested extends true
  ? Array<UnpluginOptions>
  : UnpluginOptions
export type UnpluginFactoryOutput<UserOptions, Return> = undefined extends UserOptions
  ? (options?: undefined | UserOptions) => Return
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
  esbuildHostName?: undefined | string
} | {
  framework: 'rspack'
  rspack: { compiler: RspackCompiler }
})

export interface UnpluginMessage {
  name?: undefined | string
  id?: undefined | string
  message: string
  stack?: undefined | string
  code?: undefined | string
  plugin?: undefined | string
  pluginCode?: undefined | unknown
  loc?: undefined | {
    column: number
    file?: undefined | string
    line: number
  }
  meta?: any
}

export interface UnpluginContext {
  error: (message: string | UnpluginMessage) => void
  warn: (message: string | UnpluginMessage) => void
}
