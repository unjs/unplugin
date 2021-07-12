import { Plugin as RollupPlugin } from 'rollup'

export type Thenable<T> = T | Promise<T>

export interface UnpluginHooks {
  transformInclude?: (id: string) => boolean;
  transform?: (code: string, id: string) => Thenable<string | { code: string; map: any; } | null | undefined>;
}

export interface UnpluginOptions<UserOptions> {
  name: string;
  enforce?: 'post' | 'pre' | undefined;
  setup(options?: UserOptions): UnpluginHooks;
}

export interface UnpluginInstance<UserOptions> {
  rollup: (options?: UserOptions) => RollupPlugin;
  webpack: (options?: UserOptions) => any;
}
