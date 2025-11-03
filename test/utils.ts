import { it } from 'vitest'

export const onlyBun: typeof it.only | typeof it.skip = typeof Bun !== 'undefined' ? it.only : it.skip
