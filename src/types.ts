import type { AcornNode, EmittedAsset, Plugin as RollupPlugin, PluginContextMeta as RollupContextMeta, SourceMap } from 'rollup'
import type { Compiler as WebpackCompiler, WebpackPluginInstance } from 'webpack'
import type { Plugin as VitePlugin } from 'vite'
import type { Plugin as EsbuildPlugin } from 'esbuild'
import type VirtualModulesPlugin from 'webpack-virtual-modules'

export {
  EsbuildPlugin,
  RollupPlugin,
  VitePlugin,
  WebpackCompiler
}

export type Thenable<T> = T | Promise<T>

export type TransformResult = string | { code: string; map?: SourceMap | null; } | null | undefined

export type ExternalIdResult = { id: string, external?: boolean }

export interface UnpluginBuildContext {
  addWatchFile: (id: string) => void;
  emitFile: (emittedFile: EmittedAsset) => void;
  getWatchFiles: () => string[];
  parse: (input: string, options?: any) => AcornNode;
}

export interface UnpluginOptions {
  name: string;
  enforce?: 'post' | 'pre' | undefined;
  buildStart?: (this: UnpluginBuildContext) => Promise<void> | void;
  buildEnd?: (this: UnpluginBuildContext) => Promise<void> | void;
  transformInclude?: (id: string) => boolean;
  transform?: (this: UnpluginBuildContext & UnpluginContext, code: string, id: string) => Thenable<TransformResult>;
  load?: (this: UnpluginBuildContext & UnpluginContext, id: string) => Thenable<TransformResult>
  resolveId?: (id: string, importer?: string) => Thenable<string | ExternalIdResult | null | undefined>
  watchChange?: (this: UnpluginBuildContext, id: string, change: {event: 'create' | 'update' | 'delete'}) => void

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

export type UnpluginFactory<UserOptions> = (options: UserOptions | undefined, meta: UnpluginContextMeta) => UnpluginOptions

export interface UnpluginInstance<UserOptions> {
  rollup: (options?: UserOptions) => RollupPlugin;
  webpack: (options?: UserOptions) => WebpackPluginInstance;
  vite: (options?: UserOptions) => VitePlugin;
  esbuild: (options?: UserOptions) => EsbuildPlugin;
  raw: UnpluginFactory<UserOptions>
}

export interface UnpluginContextMeta extends Partial<RollupContextMeta> {
  framework: 'rollup' | 'vite' | 'webpack' | 'esbuild'
  webpack?: {
    compiler: WebpackCompiler
  }
}

export interface UnpluginContext {
  error(message: any): void
  warn(message: any): void
}

declare module 'webpack' {
  interface Compiler {
    $unpluginContext: Record<string, ResolvedUnpluginOptions>
  }
}
