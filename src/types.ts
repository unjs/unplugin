import type { Plugin as RollupPlugin, PluginContextMeta as RollupContextMeta, SourceMap } from 'rollup'
import type { Compiler as WebpackCompiler, WebpackPluginInstance } from 'webpack'
import type { Plugin as VitePlugin } from 'vite'
import type VirtualModulesPlugin from 'webpack-virtual-modules'

export {
  RollupPlugin,
  VitePlugin,
  WebpackCompiler
}

export type Thenable<T> = T | Promise<T>

export type TransformResult = string | { code: string; map?: SourceMap | null; } | null | undefined

export interface UnpluginOptions {
  name: string;
  enforce?: 'post' | 'pre' | undefined;
  transformInclude?: (id: string) => boolean;
  transform?: (this: UnpluginContext, code: string, id: string) => Thenable<TransformResult>;
  load?: (this: UnpluginContext, id: string) => Thenable<TransformResult>
  resolveId?: (id: string, importer?: string) => Thenable<string | null | undefined>

  // framework specify extends
  rollup?: Partial<RollupPlugin>
  webpack?: (compiler: WebpackCompiler) => void
  vite?: Partial<VitePlugin>
}

export interface ResolvedUnpluginOptions extends UnpluginOptions {
  // injected internal objects
  __vfs?: VirtualModulesPlugin
  __virtualModulePrefix: string
}

export type UnpluginFactory<UserOptions> = (options: UserOptions | undefined, meta: UnpluginContextMeta) => UnpluginOptions

export interface UnpluginInstance<UserOptions> {
  rollup: (options?: UserOptions) => RollupPlugin;
  webpack: (options?: UserOptions) => WebpackPluginInstance;
  vite: (options?: UserOptions) => VitePlugin;
  raw: UnpluginFactory<UserOptions>
}

export interface UnpluginContextMeta extends Partial<RollupContextMeta> {
  framework: 'rollup' | 'vite' | 'webpack'
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
