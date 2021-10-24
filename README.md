# unplugin

[![NPM version](https://img.shields.io/npm/v/unplugin?color=a1b858&label=)](https://www.npmjs.com/package/unplugin)

> Experimental

Unified plugin system for build tools.

Currently supports:
- [Vite](https://vitejs.dev/)
- [Rollup](https://rollupjs.org/)
- [Webpack](https://webpack.js.org/)

## Hooks

`unplugin` extends the excellent [Rollup plugin API](https://rollupjs.org/guide/en/#plugins-overview) as the unified plugin interface and provides a compatible layer base on the build tools used with.

###### Supported

| Hook | Rollup | Vite | Webpack 4 | Webpack 5 |
| ---- | :----: | :--: | :-------: | :-------: |
| [`buildStart`](https://rollupjs.org/guide/en/#buildstart) | ✅ | ✅ | ✅ | ✅ |
| [`buildEnd`](https://rollupjs.org/guide/en/#buildend) | ✅ | ✅ | ✅ | ✅ |
| `transformInclude`* | ✅ | ✅ | ✅ | ✅ |
| [`transform`](https://rollupjs.org/guide/en/#transformers) | ✅ | ✅ | ✅ | ✅ |
| [`enforce`](https://rollupjs.org/guide/en/#enforce) | ❌\*\* | ✅ | ✅ | ✅ |
| [`resolveId`](https://rollupjs.org/guide/en/#resolveid) | ✅ | ✅ | ✅ | ✅ |
| [`load`](https://rollupjs.org/guide/en/#load) | ✅ | ✅ | ✅ | ✅ |

- *: Webpack's id filter is outside of loader logic; an additional hook is needed for better perf on Webpack. In Rollup and Vite, this hook has been polyfilled to match the behaviors. See for following usage examples.
- **: Rollup does not support using `enforce` to control the order of plugins. Users need to maintain the order manually.

## Usage

```ts
import { createUnplugin } from 'unplugin'

export const unplugin = createUnplugin((options: UserOptions) => {
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
    // more hooks coming
  }
})

export const vitePlugin = unplugin.vite
export const rollupPlugin = unplugin.rollup
export const webpackPlugin = unplugin.webpack
```

### Plugin Installation

###### Vite

```ts
// vite.config.ts
import MyUnplugin from './my-unplugin'

export default {
  plugins: [
    MyUnplugin.vite({ /* options */ })
  ]
}
```

###### Rollup

```ts
// rollup.config.js
import MyUnplugin from './my-unplugin'

export default {
  plugins: [
    MyUnplugin.rollup({ /* options */ })
  ]
}
```

###### Webpack

```ts
// webpack.config.js
module.exports = {
  plugins: [
    require('./my-unplugin').webpack({ /* options */ })
  ]
}
```

### Framework-specific Logic

While `unplugin` provides compatible layers for some hooks, the functionality of it is limited to the common subset of the build's plugins capability. For more advanced framework-specific usages, `unplugin` provides an escape hatch for that.

```ts
export const unplugin = createUnplugin((options: UserOptions, meta) => {

  console.log(meta.framework) // 'vite' | 'rollup' | 'webpack'

  return {
    // common unplugin hooks
    name: 'my-first-unplugin',
    transformInclude (id) { /* ... */ },
    transform (code) { /* ... */  },
    
    // framework specific hooks
    vite: {
      // Vite config
      configureServer(server) {
        // configure Vite server
      }
    },
    rollup: {
      // Rollup config
    },
    webpack(compiler) {
      // configure Webpack compiler
    }
  }
})
```

## Starter Templates

- [unplugin-starter](https://github.com/antfu/unplugin-starter)

## Examples

- [unplugin-auto-import](https://github.com/antfu/unplugin-auto-import)
- [unplugin-vue2-script-setup](https://github.com/antfu/unplugin-vue2-script-setup)
- [unplugin-icons](https://github.com/antfu/unplugin-icons)
- [unplugin-vue-components](https://github.com/antfu/unplugin-vue-components)

## License

[MIT](./LICENSE) License © 2021 Nuxt Contrib
