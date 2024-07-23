---
outline: deep
lastUpdated: false
---

# Getting Started

## Overview

**Unplugin** is a library that offers an unified plugin system for various build tools. It extends the excellent [Rollup plugin API](https://rollupjs.org/plugin-development/#plugins-overview) to serve as the standard plugin interface, and provides a compatibility layer based on the build tools employed.

**Unplugin** current supports:

- [Vite](https://vitejs.dev/)
- [Rollup](https://rollupjs.org/)
- [webpack](https://webpack.js.org/)
- [esbuild](https://esbuild.github.io/)
- [Rspack](https://www.rspack.dev/)
- [Rolldown](https://rolldown.rs/) <span style="color: #ca8a04"><strong>(⚠️ experimental)</strong></span>
- [Farm](https://www.farmfe.org/)

## Trying It Online

You can try **Unplugin** in your browser directly.

[![open](/open_in_codeflow.svg)](https://stackblitz.com/~/github.com/yuyinws/unplugin-starter?file=src/index.ts)

## Creating an Unplugin package

```shell
npx degit unplugin/unplugin-starter unplugin-starter
```
> Check the [unplugin-starter](https://github.com/unplugin/unplugin-starter) repository for more details.

## Plugin Installation

### Pre-requisites

- Node.js 14.0.0 or later

::: warning
We will discontinue support for Node.js v14 & v16 in the next major release.
Please consider upgrading to Node.js v18 or higher.
:::

### Install package

::: code-group

```bash [npm]
npm install unplugin-starter --save-dev
```

```bash [yarn]
yarn add unplugin-starter -D
```

```bash [pnpm]
pnpm add unplugin-starter -D
```

```bash [bun]
bun add unplugin-starter -D
```
:::

### Bundler & Framework Integration

::: code-group

```ts [Vite]
// vite.config.ts
import Starter from 'unplugin-starter/vite'

export default defineConfig({
  plugins: [
    Starter({ /* options */ }),
  ],
})
```

```js [Rollup]
// rollup.config.js
import Starter from 'unplugin-starter/rollup'

export default {
  plugins: [
    Starter({ /* options */ }),
  ],
}
```

```js [Rolldown]
// rolldown.config.js
import Starter from 'unplugin-starter/rolldown'

export default {
  plugins: [
    Starter({ /* options */ }),
  ],
}
```

```js [webpack]
// webpack.config.js
module.exports = {
  /* ... */
  plugins: [
    require('unplugin-starter/webpack')({ /* options */ })
  ]
}
```

```js [Rspack]
// rspack.config.js
module.exports = {
  /* ... */
  plugins: [
    require('unplugin-starter/rspack')({ /* options */ })
  ]
}
```

```js [esbuild]
// esbuild.config.js
import { build } from 'esbuild'
import Starter from 'unplugin-starter/esbuild'

build({
  plugins: [Starter()],
})
```

```ts [Farm]
// farm.config.ts
import Starter from 'unplugin-starter/farm'

export default defineConfig({
  plugins: [
    Starter({
      /* options */
    }),
  ],
})
```

```js [Vue-CLI]
// vue.config.js
module.exports = {
  configureWebpack: {
    plugins: [
      require('unplugin-starter/webpack')({ /* options */ }),
    ],
  },
}
```

```js [Nuxt]
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    ['unplugin-starter/nuxt', { /* options */ }],
  ],
})
```

```js [Astro]
// astro.config.mjs
import { defineConfig } from 'astro/config'
import Starter from 'unplugin-turbo-console/astro'

// https://astro.build/config
export default defineConfig({
  integrations: [
    Starter()
  ]
})
```

## Supported Hooks

| Hook                                                                              |     Rollup      | Vite | webpack 4 | webpack 5 |     esbuild   | Rspack | Farm |
| ----------------------------------------------------------------------------------| :-------------: | :--: | :-------: | :-------: | :-----------: | :----: | :---: |
| [`enforce`](https://vitejs.dev/guide/api-plugin.html#plugin-ordering)             | ❌ <sup>1</sup> |  ✅  |    ✅     |    ✅     | ❌ <sup>1</sup> |   ✅   |  ✅  |
| [`buildStart`](https://rollupjs.org/plugin-development/#buildstart)               |       ✅        |  ✅  |    ✅     |    ✅     |       ✅        |   ✅   |  ✅  |
| [`resolveId`](https://rollupjs.org/plugin-development/#resolveid)                 |       ✅        |  ✅  |    ✅     |    ✅     |       ✅        | ✅ <sup>5</sup> |  ✅  |
| `loadInclude`<sup>2</sup>                                                         |       ✅        |  ✅  |    ✅     |    ✅     |       ✅        |   ✅   |  ✅  |
| [`load`](https://rollupjs.org/plugin-development/#load)                           |       ✅        |  ✅  |    ✅     |    ✅     | ✅ <sup>3</sup> |   ✅   |  ✅  |
| `transformInclude`<sup>2</sup>                                                    |       ✅        |  ✅  |    ✅     |    ✅     |       ✅        |   ✅   |  ✅  |
| [`transform`](https://rollupjs.org/plugin-development/#transform)                 |       ✅        |  ✅  |    ✅     |    ✅     | ✅ <sup>3</sup> |   ✅   |  ✅  |
| [`watchChange`](https://rollupjs.org/plugin-development/#watchchange)             |       ✅        |  ✅  |    ✅     |    ✅     |       ❌        |   ✅   |  ✅  |
| [`buildEnd`](https://rollupjs.org/plugin-development/#buildend)                   |       ✅        |  ✅  |    ✅     |    ✅     |       ✅        |   ✅   |  ✅  |
| [`writeBundle`](https://rollupjs.org/plugin-development/#writebundle)<sup>4</sup> |       ✅        |  ✅  |    ✅     |    ✅     |       ✅        |   ✅   |  ✅  |

::: details Notice
1. Rollup and esbuild do not support using `enforce` to control the order of plugins. Users need to maintain the order manually.
2. webpack's id filter is outside of loader logic; an additional hook is needed for better perf on webpack. In Rollup and Vite, this hook has been polyfilled to match the behaviors. See for the following usage examples.
3. Although esbuild can handle both JavaScript and CSS and many other file formats, you can only return JavaScript in `load` and `transform` results.
4. Currently, `writeBundle` is only serves as a hook for the timing. It doesn't pass any arguments.
5. Rspack supports `resolveId` with a minimum required version of v1.0.0-alpha.1.
:::

### Usage

```ts{12-14,16-18} twoslash
import type { UnpluginFactory } from 'unplugin'
import { createUnplugin } from 'unplugin'

export interface Options {
  // define your plugin options here
}

export const unpluginFactory: UnpluginFactory<Options | undefined> = options => ({
  name: 'unplugin-starter',
  // webpack's id filter is outside of loader logic,
  // an additional hook is needed for better perf on webpack
  transformInclude(id) {
    return id.endsWith('main.ts')
  },
  // just like rollup transform
  transform(code) {
    return code.replace(/<template>/, '<template><div>Injected</div>')
  },
  // more hooks coming
})

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin

export const vitePlugin = unplugin.vite
export const rollupPlugin = unplugin.rollup
export const rolldownPlugin = unplugin.rolldown
export const webpackPlugin = unplugin.webpack
export const rspackPlugin = unplugin.rspack
export const esbuildPlugin = unplugin.esbuild
export const farmPlugin = unplugin.farm
```

## Supported Context

| Context                                                                       | Rollup | Vite | webpack 4 | webpack 5 | esbuild | Rspack | Farm |
| -------------------------------------------------------------------------- | :----: | :--: | :-------: | :-------: | :-----: | :----: | :---: |
| [`this.parse`](https://rollupjs.org/plugin-development/#this-parse)                   |   ✅   |  ✅  |    ✅     |    ✅     |   ✅    |   ✅   |  ✅  |
| [`this.addWatchFile`](https://rollupjs.org/plugin-development/#this-addwatchfile)     |   ✅   |  ✅  |    ✅     |    ✅     |   ❌    |   ✅   |  ✅  |
| [`this.emitFile`](https://rollupjs.org/plugin-development/#this-emitfile)<sup>1</sup> |   ✅   |  ✅  |    ✅     |    ✅     |   ✅    |   ✅   |  ✅  |
| [`this.getWatchFiles`](https://rollupjs.org/plugin-development/#this-getwatchfiles)   |   ✅   |  ✅  |    ✅     |    ✅     |   ❌    |   ✅   |  ✅  |
| [`this.warn`](https://rollupjs.org/plugin-development/#this-warn)                     |   ✅   |  ✅  |    ✅     |    ✅     |   ✅    |   ✅   |  ✅  |
| [`this.error`](https://rollupjs.org/plugin-development/#this-error)                   |   ✅   |  ✅  |    ✅     |    ✅     |   ✅    |   ✅   |  ✅  |

::: info Notice
1. Currently, [`this.emitFile`](https://rollupjs.org/plugin-development/#thisemitfile) only supports the `EmittedAsset` variant.
:::

##  Nested Plugins

Since `v0.10.0`, **Unplugin** supports constructing multiple nested plugins to behave like a single one.

### Bundler Supported

|         Rollup         | Vite | webpack 4 | webpack 5 | Rspack |   esbuild    | Farm |
| :--------------------: | :--: | :-------: | :-------: | :----: | :----------: | :--: |
| ✅ `>=3.1`<sup>1</sup> |  ✅  |    ✅     |    ✅     |   ✅   | ✅ (v1.8.0+) |  ✅  |

::: details Notice
1. Rollup supports nested plugins since [v3.1.0](https://github.com/rollup/rollup/releases/tag/v3.1.0). Plugin author should ask users to have a Rollup version of `>=3.1.0` when using nested plugins. For single plugin format, **Unplugin** works for any version of Rollup.
:::

### Usage
```ts twoslash
import type { UnpluginFactory } from 'unplugin'
import { createUnplugin } from 'unplugin'

export interface Options {
  // define your plugin options here
}

export const unpluginFactory: UnpluginFactory<Options | undefined> = options => (
  [
    {
      name: 'plugin-a',
      transform(code) {
        return code.replace(/<template>/, '<template><div>Injected</div>')
      },
    },
    {
      name: 'plugin-b',
      resolveId(id) {
        return id
      },
    },
  ]
)

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
```
## Bundler-Specific Logic

While **Unplugin** provides compatible layers for some hooks, the functionality of it is limited to the common subset of the build's plugins capability. For more advanced bundler-specific usages, **Unplugin** provides an escape hatch for that.

### Hooks

```ts {9,18,24,27,30,33,36,48} twoslash
import type { UnpluginFactory } from 'unplugin'
import { createUnplugin } from 'unplugin'

export interface Options {
  // define your plugin options here
}

export const unpluginFactory: UnpluginFactory<Options | undefined> = (options, meta) => {
  console.log(meta.framework) // vite rollup webpack esbuild rspack...
  return {
    name: 'unplugin-starter',
    transform(code) {
      return code.replace(/<template>/, '<template><div>Injected</div>')
    },
    transformInclude(id) {
      return id.endsWith('main.ts')
    },
    vite: {
      // Vite plugin
      configureServer(server) {
        // configure Vite server
      },
    },
    rollup: {
      // Rollup plugin
    },
    rolldown: {
      // Rolldown plugin
    },
    webpack(compiler) {
      // Configure webpack compiler
    },
    rspack(compiler) {
      // Configure Rspack compiler
    },
    esbuild: {
      // Change the filter of onResolve and onLoad
      // onResolveFilter?: RegExp,
      // onLoadFilter?: RegExp,

      // Tell esbuild how to interpret the contents. By default Unplugin tries to guess the loader
      // from file extension (eg: .js -> "js", .jsx -> 'jsx')
      // loader?: (Loader | (code: string, id: string) => Loader)

      // Or you can completely replace the setup logic
      // setup?: EsbuildPlugin.setup,
    },
    farm: {
      // Farm plugin
    }
  }
}

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
```

### Plugins

The package exports a set of functions in place of `createUnplugin` that allow for the creation of plugins for specific bundlers.
Each of the function takes the same generic factory argument as `createUnplugin`.

```ts
import {
  createEsbuildPlugin,
  createFarmPlugin,
  createRolldownPlugin,
  createRollupPlugin,
  createRspackPlugin,
  createVitePlugin,
  createWebpackPlugin
} from 'unplugin'

const vitePlugin = createVitePlugin(/* factory */)
const rollupPlugin = createRollupPlugin(/* factory */)
const rolldownPlugin = createRolldownPlugin(/* factory */)
const esbuildPlugin = createEsbuildPlugin(/* factory */)
const webpackPlugin = createWebpackPlugin(/* factory */)
const rspackPlugin = createRspackPlugin(/* factory */)
const farmPlugin = createFarmPlugin(/* factory */)
```
