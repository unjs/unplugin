import { Plugin as RollupPlugin } from 'rollup'

export interface UnpluginHooks {
  transformInclude?: (id: string) => boolean;
  transform?: (code: string, id: string) => string | { code: string; map: any; };
}

export interface UnpluginOptions<UserOptions, ResolvedContext = UserOptions> {
  name: string;
  enforce?: 'post' | 'pre' | undefined;
  setup(options?: UserOptions): ResolvedContext;
  hooks(options: ResolvedContext): UnpluginHooks;
  rollup?: Partial<RollupPlugin>;
}

export interface UnpluginInstance<UserOptions> {
  rollup: (options?: UserOptions) => RollupPlugin;
  webpack: { new(): any; };
}
