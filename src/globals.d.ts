/**
 * Flag that is replaced with a boolean during build time. __BUNDLED__ is true in the final library output, and it is
 * false when the library is ad-hoc transpiled, ie. during tests.
 *
 * See "tsup.config.ts" and "vitest.config.ts" for more info.
 */
declare const __BUNDLED__: boolean
