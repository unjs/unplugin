import { Plugin as RollupPlugin } from 'rollup'

export type Thenable<T> = T | Promise<T>

export interface UnpluginHooks {
  name: string;
  enforce?: 'post' | 'pre' | undefined;
  transformInclude?: (id: string) => boolean;
  transform?: (code: string, id: string) => Thenable<string | { code: string; map: any; } | null | undefined>;
  load?: (id?:string) => Thenable<string | null | undefined>
  resolveId?: (id?:string) => Thenable<string | null | undefined>
}

export type UnpluginFactory<UserOptions> = (options?: UserOptions) => UnpluginHooks

export interface UnpluginInstance<UserOptions> {
  rollup: (options?: UserOptions) => RollupPlugin;
  webpack: (options?: UserOptions) => any;
}
