import type { AcornNode, EmittedAsset, PluginContextMeta as RollupContextMeta, Plugin as RollupPlugin, SourceMapInput } from 'rollup'
import type { Compiler as WebpackCompiler, WebpackPluginInstance } from 'webpack'
import type { Plugin as VitePlugin } from 'vite'
import type { Plugin as EsbuildPlugin, PluginBuild } from 'esbuild'
import type VirtualModulesPlugin from 'webpack-virtual-modules'

export {
  EsbuildPlugin,
  RollupPlugin,
  VitePlugin,
  WebpackCompiler,
}

export type Thenable<T> = T | Promise<T>

export type TransformResult = string | { code: string; map?: SourceMapInput | null } | null | undefined

export interface ExternalIdResult { id: string; external?: boolean }

export interface UnpluginBuildContext {
  addWatchFile: (id: string) => void
  emitFile: (emittedFile: EmittedAsset) => void
  getWatchFiles: () => string[]
  parse: (input: string, options?: any) => AcornNode
}

export interface UnpluginOptions {
  name: string
  enforce?: 'post' | 'pre' | undefined

  // Build Hooks
  buildStart?: (this: UnpluginBuildContext) => Promise<void> | void
  buildEnd?: (this: UnpluginBuildContext) => Promise<void> | void
  transform?: (this: UnpluginBuildContext & UnpluginContext, code: string, id: string) => Thenable<TransformResult>
  load?: (this: UnpluginBuildContext & UnpluginContext, id: string) => Thenable<TransformResult>
  resolveId?: (id: string, importer: string | undefined, options: { isEntry: boolean }) => Thenable<string | ExternalIdResult | null | undefined>
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
  vite?: Partial<VitePlugin>
  esbuild?: {
    // using regexp in esbuild improves performance
    onResolveFilter?: RegExp
    onLoadFilter?: RegExp
    setup?: EsbuildPlugin['setup']
  }
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
  webpack: UnpluginFactoryOutput<UserOptions, WebpackPluginInstance>
  esbuild: UnpluginFactoryOutput<UserOptions, EsbuildPlugin>
  raw: UnpluginFactory<UserOptions, Nested>
}

export type UnpluginContextMeta = Partial<RollupContextMeta> & ({
  framework: 'rollup' | 'vite'
} | {
  framework: 'webpack'
  webpack: {
    compiler: WebpackCompiler
  }
} | {
  framework: 'esbuild'
  build?: PluginBuild
  /** Set the host plugin name of esbuild when returning multiple plugins */
  esbuildHostName?: string
})

export interface UnpluginContext {
  error(message: any): void
  warn(message: any): void
}

declare module 'webpack' {
  interface Compiler {
    $unpluginContext: Record<string, ResolvedUnpluginOptions>
  }
}
