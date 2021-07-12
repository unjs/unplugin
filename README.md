# unplugin

> Experimental

## Support

- [x] Module transform
- [ ] Virtual Module
- [ ] Id Resolve

## Usage

```ts
import { defineUnplugin } from 'unplugin'

const plugin = defineUnplugin((options: UserOptions) => {
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



