import { Compiler } from 'webpack'
import { PluginContextMeta as RollupContextMeta } from 'rollup'

export interface UnpluginContextMeta extends Partial<RollupContextMeta> {
  framework: 'rollup' | 'vite' | 'webpack'
  webpack?: {
    compiler: Compiler
  }
}

export interface UnpluginContext {
  error(message: string | Error): void
  warn(message: string | Error): void
}
