import * as BunModule from 'bun'

declare global {
  export import Bun = BunModule

  /**
   * Flag that is replaced with a boolean during build time.
   * __DEV__ is false in the final library output, and it is
   * true when the library is ad-hoc transpiled, ie. during tests.
   *
   * See "tsdown.config.ts" and "vitest.config.ts" for more info.
   */
  declare const __DEV__: boolean
}

declare module 'bun' {
  interface PluginBuilder {
    // This can be removed once Bun 1.2.22 is released
    onEnd: (callback: (build: BuildOutput) => void | Promise<void>) => void
  }
}
