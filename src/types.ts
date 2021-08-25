import type { Plugin as RollupPlugin } from 'rollup'
import type { Compiler as WebpackCompiler, WebpackPluginInstance } from 'webpack'
import type { Plugin as VitePlugin } from 'vite'
import VirtualModulesPlugin from 'webpack-virtual-modules'
import { UnpluginContext, UnpluginContextMeta } from './context'

export {
  RollupPlugin,
  VitePlugin,
  WebpackCompiler
}

export type Thenable<T> = T | Promise<T>

export interface UnpluginOptions {
  name: string;
  enforce?: 'post' | 'pre' | undefined;
  transformInclude?: (id: string) => boolean;
  transform?: (this: UnpluginContext, code: string, id: string) => Thenable<string | { code: string; map: any; } | null | undefined>;
  load?: (this: UnpluginContext, id?:string) => Thenable<string | null | undefined>
  resolveId?: (id: string, importer?: string) => Thenable<string | null | undefined>

  // framework specify extends
  rollup?: Partial<RollupPlugin>
  webpack?: (compiler: WebpackCompiler) => void
  vite?: Partial<VitePlugin>
}

export interface ResolvedUnpluginOptions extends UnpluginOptions {
  // injected internal objects
  __vfs?: VirtualModulesPlugin
}

export type UnpluginFactory<UserOptions> = (options: UserOptions | undefined, meta: UnpluginContextMeta) => UnpluginOptions

export interface UnpluginInstance<UserOptions> {
  rollup: (options?: UserOptions) => RollupPlugin;
  webpack: (options?: UserOptions) => WebpackPluginInstance;
  vite: (options?: UserOptions) => VitePlugin;
  raw: UnpluginFactory<UserOptions>
}

declare module 'webpack' {
  interface Compiler {
    $unpluginContext: Record<string, ResolvedUnpluginOptions>
  }
}
