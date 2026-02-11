---
outline: deep
lastUpdated: false
---

# Getting Started

## Overview

**Unplugin** is a library that offers a unified plugin system for various build tools. It extends the excellent [Rollup plugin API](https://rollupjs.org/plugin-development/#plugins-overview) to serve as the standard plugin interface, and provides a compatibility layer based on the build tools employed.

**Unplugin** currently supports:

- [Vite](https://vite.dev/)
- [Rollup](https://rollupjs.org/)
- [webpack](https://webpack.js.org/)
- [esbuild](https://esbuild.github.io/)
- [Rspack](https://www.rspack.dev/)
- [Rolldown](https://rolldown.rs/)
- [Farm](https://www.farmfe.org/)
- [Bun](https://bun.com/)

## Trying It Online

You can try **Unplugin** in your browser directly.

[![open](/open_in_codeflow.svg)](https://stackblitz.com/~/github.com/yuyinws/unplugin-starter?file=src/index.ts)

## Creating an Unplugin package

### Templates

- [unplugin/unplugin-starter](https://github.com/unplugin/unplugin-starter)
- [sxzz/unplugin-starter](https://github.com/sxzz/unplugin-starter)

Check repositories above for more details.

## Plugin Installation

### Pre-requisites

- Node.js 18.12.0 or later.
- webpack 5 or later, if you are using webpack.

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
    Starter({
      /* options */
    }),
  ],
})
```

```js [Rollup]
// rollup.config.js
import Starter from 'unplugin-starter/rollup'

export default {
  plugins: [
    Starter({
      /* options */
    }),
  ],
}
```

```js [Rolldown]
// rolldown.config.js
import Starter from 'unplugin-starter/rolldown'

export default {
  plugins: [
    Starter({
      /* options */
    }),
  ],
}
```

```js [webpack]
// webpack.config.js
module.exports = {
  /* ... */
  plugins: [
    require('unplugin-starter/webpack')({
      /* options */
    }),
  ],
}
```

```js [Rspack]
// rspack.config.js
module.exports = {
  /* ... */
  plugins: [
    require('unplugin-starter/rspack')({
      /* options */
    }),
  ],
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

```ts [Bun]
// bun.config.ts
import Starter from 'unplugin-starter/bun'

await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
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
      require('unplugin-starter/webpack')({
        /* options */
      }),
    ],
  },
}
```

```js [Nuxt]
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    [
      'unplugin-starter/nuxt',
      {
        /* options */
      },
    ],
  ],
})
```

```js [Astro]
// astro.config.mjs
import { defineConfig } from 'astro/config'
import Starter from 'unplugin-turbo-console/astro'

// https://astro.build/config
export default defineConfig({
  integrations: [Starter()],
})
```

## Supported Hooks

| Hook                                                                              |     Rollup      | Vite | webpack |     esbuild     |     Rspack      | Farm | Rolldown |       Bun       |
| --------------------------------------------------------------------------------- | :-------------: | :--: | :-----: | :-------------: | :-------------: | :--: | :------: | :-------------: |
| [`enforce`](https://vite.dev/guide/api-plugin.html#plugin-ordering)               | ❌ <sup>1</sup> |  ✅  |   ✅    | ❌ <sup>1</sup> |       ✅        |  ✅  |    ✅    |       ❌        |
| [`buildStart`](https://rollupjs.org/plugin-development/#buildstart)               |       ✅        |  ✅  |   ✅    |       ✅        |       ✅        |  ✅  |    ✅    |       ✅        |
| [`resolveId`](https://rollupjs.org/plugin-development/#resolveid)                 |       ✅        |  ✅  |   ✅    |       ✅        | ✅ <sup>5</sup> |  ✅  |    ✅    |       ✅        |
| ~~`loadInclude`~~<sup>2</sup>                                                     |       ✅        |  ✅  |   ✅    |       ✅        |       ✅        |  ✅  |    ✅    |       ✅        |
| [`load`](https://rollupjs.org/plugin-development/#load)                           |       ✅        |  ✅  |   ✅    | ✅ <sup>3</sup> |       ✅        |  ✅  |    ✅    |       ✅        |
| ~~`transformInclude`~~<sup>2</sup>                                                |       ✅        |  ✅  |   ✅    |       ✅        |       ✅        |  ✅  |    ✅    |       ✅        |
| [`transform`](https://rollupjs.org/plugin-development/#transform)                 |       ✅        |  ✅  |   ✅    | ✅ <sup>3</sup> |       ✅        |  ✅  |    ✅    |       ✅        |
| [`watchChange`](https://rollupjs.org/plugin-development/#watchchange)             |       ✅        |  ✅  |   ✅    |       ❌        |       ✅        |  ✅  |    ✅    |       ❌        |
| [`buildEnd`](https://rollupjs.org/plugin-development/#buildend)                   |       ✅        |  ✅  |   ✅    |       ✅        |       ✅        |  ✅  |    ✅    | ❌ <sup>6</sup> |
| [`writeBundle`](https://rollupjs.org/plugin-development/#writebundle)<sup>4</sup> |       ✅        |  ✅  |   ✅    |       ✅        |       ✅        |  ✅  |    ✅    | ❌ <sup>6</sup> |

::: details Notice

1. Rollup and esbuild do not support using `enforce` to control the order of plugins. Users need to maintain the order manually.
2. Webpack's id filter is outside of loader logic; an additional hook is needed for better performance on Webpack and Rolldown.
   However, it is now deprecated. Please use `transform/load/resolveId.filter` instead.
   In Rollup, this hook has been polyfilled to match the behaviors. See the following usage examples for reference.
3. Although esbuild can handle both JavaScript and CSS and many other file formats, you can only return JavaScript in `load` and `transform` results.
4. Currently, `writeBundle` is only serves as a hook for the timing. It doesn't pass any arguments.
5. Rspack supports `resolveId` with a minimum required version of v1.0.0-alpha.1.
6. Bun's plugin API doesn't have an `onEnd` hook yet, so `buildEnd` and `writeBundle` are not supported.

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
  transform: {
    // an additional hook is needed for better perf on webpack and rolldown
    filter: {
      id: /main\.ts$/
    },
    handler(code) {
      return code.replace(/<template>/, '<template><div>Injected</div>')
    },
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
export const bunPlugin = unplugin.bun
```

### Filters

To optimize performance in native bundlers, leverage the `filter` option in `resolveId`, `transform`, and `load`
hooks to exclude files that don’t require processing.

```ts twoslash
import { createUnplugin } from 'unplugin'

type FilterPattern = string | RegExp | Array<string | RegExp>

const plugin = createUnplugin(() => ({
  name: 'unplugin-starter',
  transform: {
    filter: {
      id: {
        include: [/\.js$/, '**/*.ts'],
        exclude: /node_modules/,
      },
      code: {
        include: 'foo',
        exclude: 'bar',
      },
    },
    handler(code) {
      // ...
    },
  }
}))
```

More details can be found in the [Rolldown's documentation](https://rolldown.rs/guide/plugin-development#plugin-hook-filters).

## Supported Context

| Context                                                                               | Rollup | Vite | webpack | esbuild | Rspack | Farm | Rolldown | Bun |
| ------------------------------------------------------------------------------------- | :----: | :--: | :-----: | :-----: | :----: | :--: | :------: | :-: |
| [`this.parse`](https://rollupjs.org/plugin-development/#this-parse)<sup>1</sup>       |   ✅   |  ✅  |   ✅    |   ✅    |   ✅   |  ✅  |    ✅    | ✅  |
| [`this.addWatchFile`](https://rollupjs.org/plugin-development/#this-addwatchfile)     |   ✅   |  ✅  |   ✅    |   ❌    |   ✅   |  ✅  |    ✅    | ✅  |
| [`this.emitFile`](https://rollupjs.org/plugin-development/#this-emitfile)<sup>2</sup> |   ✅   |  ✅  |   ✅    |   ✅    |   ✅   |  ✅  |    ✅    | ✅  |
| [`this.getWatchFiles`](https://rollupjs.org/plugin-development/#this-getwatchfiles)   |   ✅   |  ✅  |   ✅    |   ❌    |   ✅   |  ✅  |    ✅    | ✅  |
| [`this.warn`](https://rollupjs.org/plugin-development/#this-warn)                     |   ✅   |  ✅  |   ✅    |   ✅    |   ✅   |  ✅  |    ✅    | ✅  |
| [`this.error`](https://rollupjs.org/plugin-development/#this-error)                   |   ✅   |  ✅  |   ✅    |   ✅    |   ✅   |  ✅  |    ✅    | ✅  |

::: info Notice

1. For bundlers other than Rollup, Rolldown, or Vite, `setParseImpl` must be called to manually provide a parser implementation. Parsers such as [Acorn](https://github.com/acornjs/acorn), [Babel](https://babeljs.io/), or [Oxc](https://oxc.rs/) can be used.
2. Currently, [`this.emitFile`](https://rollupjs.org/plugin-development/#thisemitfile) only supports the `EmittedAsset` variant.

:::

## Nested Plugins

**Unplugin** supports constructing multiple nested plugins to behave like a single one.

### Bundler Supported

|         Rollup         | Vite | webpack | Rspack | esbuild | Farm | Rolldown | Bun |
| :--------------------: | :--: | :-----: | :----: | :-----: | :--: | :------: | :-: |
| ✅ `>=3.1`<sup>1</sup> |  ✅  |   ✅    |   ✅   |   ✅    |  ✅  |    ✅    | ✅  |

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

export const unpluginFactory: UnpluginFactory<Options | undefined> = options => [
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

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
```

## Bundler-Specific Logic

While **Unplugin** provides compatible layers for some hooks, the functionality of it is limited to the common subset of the build's plugins capability. For more advanced bundler-specific usages, **Unplugin** provides an escape hatch for that.

### Hooks

```ts {9,18,20,26,29,32,35,38,50} twoslash
import type { UnpluginFactory } from 'unplugin'
import { createUnplugin } from 'unplugin'

export interface Options {
  // define your plugin options here
}

export const unpluginFactory: UnpluginFactory<Options | undefined> = (
  options,
  meta,
) => {
  console.log(meta.framework) // vite rollup webpack esbuild rspack...
  return {
    name: 'unplugin-starter',
    buildStart() {
      console.log(meta.frameworkVersion) // x.y.z
    },
    transform: {
      // an additional hook is needed for better perf on webpack and rolldown
      filter: {
        id: /main\.ts$/
      },
      handler(code) {
        return code.replace(/<template>/, '<template><div>Injected</div>')
      },
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
    },
    bun: {
      // Bun plugin
    },
  }
}

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
```

#### `meta.frameworkVersion`

When your plugin needs behavior depending on the exact bundler version,
use `meta.frameworkVersion` which is the version string `"x.y.z"`
from the host framework version.

|     Rollup     |      Vite      | webpack | Rspack | esbuild | Farm |    Rolldown    |    Unloader    | Bun |
| :------------: | :------------: | :-----: | :----: | :-----: | :--: | :------------: | :------------: | :-: |
| ✅<sup>1</sup> | ✅<sup>1</sup> |   ✅    |   ✅   |   ❌    |  ❌  | ✅<sup>1</sup> | ✅<sup>1</sup> | ✅  |

::: details Notice

1. For Rollup-compatible hosts (`vite`, `rollup`, `rolldown`, `unloader`), `frameworkVersion` is not available until hook code, starting with `buildStart`.

:::

### Plugins

The package exports a set of functions in place of `createUnplugin` that allow for the creation of plugins for specific bundlers.
Each of the function takes the same generic factory argument as `createUnplugin`.

```ts
import {
  createBunPlugin,
  createEsbuildPlugin,
  createFarmPlugin,
  createRolldownPlugin,
  createRollupPlugin,
  createRspackPlugin,
  createVitePlugin,
  createWebpackPlugin,
} from 'unplugin'

const vitePlugin = createVitePlugin(/* factory */)
const rollupPlugin = createRollupPlugin(/* factory */)
const rolldownPlugin = createRolldownPlugin(/* factory */)
const esbuildPlugin = createEsbuildPlugin(/* factory */)
const webpackPlugin = createWebpackPlugin(/* factory */)
const rspackPlugin = createRspackPlugin(/* factory */)
const farmPlugin = createFarmPlugin(/* factory */)
const bunPlugin = createBunPlugin(/* factory */)
```
