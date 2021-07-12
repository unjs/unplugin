import { Plugin as RollupPlugin } from 'rollup'

export interface UnpluginHooks {
  transformInclude?: (id: string) => boolean;
  transform?: (code: string, id: string) => string | { code: string; map: any; };
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
