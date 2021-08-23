# unplugin

> Experimental

Unified plugin system for Vite, Rollup, and Webpack

## Support

| Rollup | Webpack |
| ------ | ------- |
| `transform` | ✅ |
| `resolveId` | 🚧 |
| `load` | ✅ |

## Usage

```ts
import { createUnplugin } from 'unplugin'

const plugin = createUnplugin((options: UserOptions) => {
  return {
    name: 'my-first-unplugin',
    // webpack's id filter is outside of loader logic,
    // an additional hook is needed for better perf on webpack
    transformInclude (id) {
      return id.endsWith('.vue')
    },
    // just like rollup transform
    transform (code) {
      return code.replace(/<template>/, `<template><div>Injected</div>`)
    },
    // more hooks incoming
  }
})

const rollupPlugin = plugin.rollup({ /* ...user options */ })
const webpackPlugin = plugin.webpack()
```

See [vue2-script-setup-transform](https://github.com/antfu/vue2-script-setup-transform) as an example.
