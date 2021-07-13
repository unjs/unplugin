import { Plugin as RollupPlugin } from 'rollup'

export type Thenable<T> = T | Promise<T>

export interface UnpluginOptions {
  name: string;
  enforce?: 'post' | 'pre' | undefined;
  transformInclude?: (id: string) => boolean;
  transform?: (code: string, id: string) => Thenable<string | { code: string; map: any; } | null | undefined>;
  load?: (id?:string) => Thenable<string | null | undefined>
  resolveId?: (id?:string) => Thenable<string | null | undefined>
}

export type UnpluginFactory<UserOptions> = (options?: UserOptions) => UnpluginOptions

export interface UnpluginInstance<UserOptions> {
  rollup: (options?: UserOptions) => RollupPlugin;
  webpack: (options?: UserOptions) => any;
}

declare module 'webpack' {
  interface Compiler {
    $unpluginContext: Record<string, UnpluginOptions>
  }
}
