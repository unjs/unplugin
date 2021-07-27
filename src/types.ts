import type { Plugin as RollupPlugin } from 'rollup'
import type { Compiler as WebpackCompiler } from 'webpack'
import type { Plugin as VitePlugin } from 'vite'
import VirtualModulesPlugin from 'webpack-virtual-modules'

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
  transform?: (code: string, id: string) => Thenable<string | { code: string; map: any; } | null | undefined>;
  load?: (id?:string) => Thenable<string | null | undefined>
  resolveId?: (id?:string) => Thenable<string | null | undefined>

  // framework specify extends
  rollup?: Partial<RollupPlugin>
  webpack?: (compiler: WebpackCompiler) => void
  vite?: Partial<VitePlugin>

  // injected internal objects
  __vfs?: VirtualModulesPlugin
}

export type UnpluginFactory<UserOptions> = (options?: UserOptions) => UnpluginOptions

export interface UnpluginInstance<UserOptions> {
  rollup: (options?: UserOptions) => RollupPlugin;
  webpack: (options?: UserOptions) => any;
  vite: (options?: UserOptions) => VitePlugin;
  raw: UnpluginFactory<UserOptions>
}

declare module 'webpack' {
  interface Compiler {
    $unpluginContext: Record<string, UnpluginOptions>
  }
}
