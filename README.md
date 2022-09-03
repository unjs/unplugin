# unplugin

[![NPM version](https://img.shields.io/npm/v/unplugin?color=a1b858&label=)](https://www.npmjs.com/package/unplugin)

Unified plugin system for build tools.

Currently supports:
- [Vite](https://vitejs.dev/)
- [Rollup](https://rollupjs.org/)
- [Webpack](https://webpack.js.org/)
- [esbuild](https://esbuild.github.io/)

## Hooks

`unplugin` extends the excellent [Rollup plugin API](https://rollupjs.org/guide/en/#plugins-overview) as the unified plugin interface and provides a compatible layer base on the build tools used with.

###### Supported

| Hook | Rollup | Vite | Webpack 4 | Webpack 5 | esbuild |
| ---- | :----: | :--: | :-------: | :-------: | :-----: |
| [`enforce`](https://rollupjs.org/guide/en/#enforce) | ❌ <sup>1</sup> | ✅ | ✅ | ✅ | ❌ <sup>1</sup> |
| [`buildStart`](https://rollupjs.org/guide/en/#buildstart) | ✅ | ✅ | ✅ | ✅ | ✅ |
| [`resolveId`](https://rollupjs.org/guide/en/#resolveid) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `loadInclude`<sup>2</sup> | ✅ | ✅ | ✅ | ✅ | ✅ |
| [`load`](https://rollupjs.org/guide/en/#load) | ✅ | ✅ | ✅ | ✅ | ✅ <sup>3</sup> |
| `transformInclude`<sup>2</sup> | ✅ | ✅ | ✅ | ✅ | ✅ |
| [`transform`](https://rollupjs.org/guide/en/#transformers) | ✅ | ✅ | ✅ | ✅ | ✅ <sup>3</sup> |
| [`watchChange`](https://rollupjs.org/guide/en/#watchchange) | ✅ | ✅ | ✅ | ✅ | ✅ |
| [`buildEnd`](https://rollupjs.org/guide/en/#buildend) | ✅ | ✅ | ✅ | ✅ | ✅ |

1. Rollup and esbuild do not support using `enforce` to control the order of plugins. Users need to maintain the order manually.
2. Webpack's id filter is outside of loader logic; an additional hook is needed for better perf on Webpack. In Rollup and Vite, this hook has been polyfilled to match the behaviors. See for following usage examples.
3. Although esbuild can handle both JavaScript and CSS and many other file formats, you can only return JavaScript in `load` and `transform` results.

### Hook Context

###### Supported

| Hook | Rollup | Vite | Webpack 4 | Webpack 5 | esbuild |
| ---- | :----: | :--: | :-------: | :-------: | :-----: |
| [`this.parse`](https://rollupjs.org/guide/en/#thisparse) | ✅ | ✅ | ✅ | ✅ | ✅ |
| [`this.addWatchFile`](https://rollupjs.org/guide/en/#thisaddwatchfile) | ✅ | ✅ | ✅ | ✅ | ✅ |
| [`this.emitFile`](https://rollupjs.org/guide/en/#thisemitfile)<sup>4</sup> | ✅ | ✅ | ✅ | ✅ | ✅ |
| [`this.getWatchFiles`](https://rollupjs.org/guide/en/#thisgetwatchfiles) | ✅ | ✅ | ✅ | ✅ | ✅ |
| [`this.warn`](https://rollupjs.org/guide/en/#thiswarn) | ✅ | ✅ | ✅ | ✅ | ✅ |
| [`this.error`](https://rollupjs.org/guide/en/#thiserror) | ✅ | ✅ | ✅ | ✅ | ✅ |


4. Currently, [`this.emitFile`](https://rollupjs.org/guide/en/#thisemitfile) only supports the `EmittedAsset` variant.

## Usage

```ts
import { createUnplugin } from 'unplugin'

export const unplugin = createUnplugin((options: UserOptions) => {
  return {
    name: 'unplugin-prefixed-name',
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
export const esbuildPlugin = unplugin.esbuild
```

### Plugin Installation

###### Vite

```ts
// vite.config.ts
import UnpluginFeature from './unplugin-feature'

export default {
  plugins: [
    UnpluginFeature.vite({ /* options */ })
  ]
}
```

###### Rollup

```ts
// rollup.config.js
import UnpluginFeature from './unplugin-feature'

export default {
  plugins: [
    UnpluginFeature.rollup({ /* options */ })
  ]
}
```

###### Webpack

```ts
// webpack.config.js
module.exports = {
  plugins: [
    require('./unplugin-feature').webpack({ /* options */ })
  ]
}
```

###### esbuild

```ts
// esbuild.config.js
import { build } from 'esbuild'

build({
  plugins: [
    require('./unplugin-feature').esbuild({ /* options */ })
  ]
})
```

### Framework-specific Logic

While `unplugin` provides compatible layers for some hooks, the functionality of it is limited to the common subset of the build's plugins capability. For more advanced framework-specific usages, `unplugin` provides an escape hatch for that.

```ts
export const unplugin = createUnplugin((options: UserOptions, meta) => {

  console.log(meta.framework) // 'vite' | 'rollup' | 'webpack' | 'esbuild'

  return {
    // common unplugin hooks
    name: 'unplugin-prefixed-name',
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
    },
    esbuild: {
      // change the filter of onResolve and onLoad
      onResolveFilter?: RegExp
      onLoadFilter?: RegExp
      // or you can completely replace the setup logic
      setup?: EsbuildPlugin['setup']
    }
  }
})
```

## Conventions

- Plugins powered by unplugin should have a clear name with `unplugin-` prefix.
- Include `unplugin` keyword in `package.json`.
- To provide better DX, packages could export 2 kinds of entry points:
  - Default export: the returned value of `createUnplugin` function

     ```ts
     import UnpluginFeature from 'unplugin-feature'
     ```

  - Subpath exports: properties of the returned value of `createUnplugin` function for each framework users

     ```ts
     import VitePlugin from 'unplugin-feature/vite'
     ```
  - Refer to [unplugin-starter](https://github.com/antfu/unplugin-starter) for more details about this setup.

## Starter Templates

- [unplugin-starter](https://github.com/antfu/unplugin-starter)

## Examples

- [unplugin-auto-import](https://github.com/antfu/unplugin-auto-import)
- [unplugin-vue2-script-setup](https://github.com/antfu/unplugin-vue2-script-setup)
- [unplugin-icons](https://github.com/antfu/unplugin-icons)
- [unplugin-vue-components](https://github.com/antfu/unplugin-vue-components)
- [unplugin-upload-cdn](https://github.com/zenotsai/unplugin-upload-cdn)
- [unplugin-web-ext](https://github.com/jwr12135/unplugin-web-ext)
- [unplugin-properties](https://github.com/pd4d10/unplugin-properties)
- [unplugin-moment-to-dayjs](https://github.com/1247748612/unplugin-moment-to-dayjs)
- [unplugin-object-3d](https://github.com/m0ksem/unplugin-object-3d)
- [unplugin-parcel-css](https://github.com/ssssota/unplugin-parcel-css)
- [unplugin-vue](https://github.com/sxzz/unplugin-vue)
- [unplugin-vue-define-options](https://github.com/sxzz/unplugin-vue-define-options)
- [unplugin-jsx-string](https://github.com/sxzz/unplugin-jsx-string)
- [unplugin-ast](https://github.com/sxzz/unplugin-ast)
- [unplugin-element-plus](https://github.com/element-plus/unplugin-element-plus)

## License

[MIT](./LICENSE) License © 2021 Nuxt Contrib
