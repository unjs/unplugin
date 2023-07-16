# [1.4.0](https://github.com/unjs/unplugin/compare/v1.3.2...v1.4.0) (2023-07-16)



## [1.3.2](https://github.com/unjs/unplugin/compare/v1.3.1...v1.3.2) (2023-07-03)


### Bug Fixes

* add type export ([#304](https://github.com/unjs/unplugin/issues/304)) ([127616d](https://github.com/unjs/unplugin/commit/127616da037f261fc7dd0255c5e984512803a4d1))


### Features

* add top-level functions to create platform-specific plugins ([#301](https://github.com/unjs/unplugin/issues/301)) ([efbbba5](https://github.com/unjs/unplugin/commit/efbbba595096657d94f39a3e8953d1ed60de86dc))
* add unplugin-fonts ([#292](https://github.com/unjs/unplugin/issues/292)) ([80a61d1](https://github.com/unjs/unplugin/commit/80a61d10bfbb46fabaf7c55f5e11877901dc2d77))
* **rspack:** support `enforce` ([856b073](https://github.com/unjs/unplugin/commit/856b0736dbb658ffd6cf32d246359683b622b36f))
* **rspack:** support buildStart ([#319](https://github.com/unjs/unplugin/issues/319)) ([c9bbc97](https://github.com/unjs/unplugin/commit/c9bbc97e6587085c161b29cd0699dae09a42dd88))



## [1.3.1](https://github.com/unjs/unplugin/compare/v1.3.0...v1.3.1) (2023-03-14)


### Reverts

* "feat(webpack): use loader options, improve compactiblity with webpack 5 & rspack ([#279](https://github.com/unjs/unplugin/issues/279))" ([166ef6f](https://github.com/unjs/unplugin/commit/166ef6f57527509e904f26c6c8ae9fe0722becbb))



# [1.3.0](https://github.com/unjs/unplugin/compare/v1.2.0...v1.3.0) (2023-03-11)


### Features

* experimental support for rspack ([#285](https://github.com/unjs/unplugin/issues/285)) ([525f69b](https://github.com/unjs/unplugin/commit/525f69b27722973827f87d061dc810b3a50d6b46))



# [1.2.0](https://github.com/unjs/unplugin/compare/v1.1.0...v1.2.0) (2023-03-10)


### Features

* **webpack:** use loader options, improve compactiblity with webpack 5 & rspack ([#279](https://github.com/unjs/unplugin/issues/279)) ([a8817bd](https://github.com/unjs/unplugin/commit/a8817bd992c8c65a603dcc43b33ebe78f9cd703c))



# [1.1.0](https://github.com/unjs/unplugin/compare/v1.0.1...v1.1.0) (2023-02-15)


### Bug Fixes

* compact with new magic-string type ([979c88f](https://github.com/unjs/unplugin/commit/979c88fa77e80bb9911f9db1d699999906acc3ec))
* move types to the first field ([#270](https://github.com/unjs/unplugin/issues/270)) ([60b9f7c](https://github.com/unjs/unplugin/commit/60b9f7c86d06be49de4c2e9caffb64fa8e74495a))



## [1.0.1](https://github.com/unjs/unplugin/compare/v1.0.0...v1.0.1) (2022-12-12)


### Bug Fixes

* **types:** add Nested generic to createUnplugin ([#194](https://github.com/unjs/unplugin/issues/194)) ([971df69](https://github.com/unjs/unplugin/commit/971df698b24e8c008df9d7a00e27facf0b820f6e))


### Features

* **esbuild:** add plugin build context to meta ([#226](https://github.com/unjs/unplugin/issues/226)) ([00830c3](https://github.com/unjs/unplugin/commit/00830c35395565383845d9436bb30df5004d01fd))



# [1.0.0](https://github.com/unjs/unplugin/compare/v0.10.2...v1.0.0) (2022-11-14)

No breaking changes, bumping the version to mark it as stable.

### Bug Fixes

* add types to export map ([#191](https://github.com/unjs/unplugin/issues/191)) ([b0c1021](https://github.com/unjs/unplugin/commit/b0c1021903bd2d1df73699f4215d2b92e1d2216f))
* internal TS type errors ([#187](https://github.com/unjs/unplugin/issues/187)) ([20987e9](https://github.com/unjs/unplugin/commit/20987e98f389647a4614d8848e8eb4b3b099e7db))



## [0.10.2](https://github.com/unjs/unplugin/compare/v0.10.1...v0.10.2) (2022-10-25)


### Features

* **types:** improve return types ([dc05040](https://github.com/unjs/unplugin/commit/dc050408e77eb5ed249bd56e0958a29fad21e2d8))



## [0.10.1](https://github.com/unjs/unplugin/compare/v0.10.0...v0.10.1) (2022-10-22)


### Features

* add `writeBundle` hook ([#179](https://github.com/unjs/unplugin/issues/179)) ([160ec72](https://github.com/unjs/unplugin/commit/160ec72e936ca96fd5ed91ab765e9912d09c1017))



# [0.10.0](https://github.com/unjs/unplugin/compare/v0.9.6...v0.10.0) (2022-10-18)


### Features

* support nested plugins ([#176](https://github.com/unjs/unplugin/issues/176)) ([d35e055](https://github.com/unjs/unplugin/commit/d35e0552d06118a0efc39b02641fcc4f3176fdd6))



## [0.9.6](https://github.com/unjs/unplugin/compare/v0.9.5...v0.9.6) (2022-09-21)


### Bug Fixes

* remove all peer dependency, close [#170](https://github.com/unjs/unplugin/issues/170) ([6d3d5af](https://github.com/unjs/unplugin/commit/6d3d5af6b00eef367ab03182229a9efa125bd61b))



## [0.9.5](https://github.com/unjs/unplugin/compare/v0.9.4...v0.9.5) (2022-08-25)


### Bug Fixes

* **types:** align source map with rollup ([#161](https://github.com/unjs/unplugin/issues/161)) ([95d2e45](https://github.com/unjs/unplugin/commit/95d2e4562bdadb458ce504e74805a77d6a33ba93))



## [0.9.4](https://github.com/unjs/unplugin/compare/v0.9.3...v0.9.4) (2022-08-21)


### Features

* introduce new `loadInclude` hook ([#157](https://github.com/unjs/unplugin/issues/157)) ([7482dc1](https://github.com/unjs/unplugin/commit/7482dc1fcd359ece333a05ad60b1c952f689a945))



## [0.9.3](https://github.com/unjs/unplugin/compare/v0.9.2...v0.9.3) (2022-08-18)


### Bug Fixes

* **webpack:** avoid repeat set __vfsModules value ([#155](https://github.com/unjs/unplugin/issues/155)) ([de5af69](https://github.com/unjs/unplugin/commit/de5af69440afe8433f86d82101335b65e4b8097d))



## [0.9.2](https://github.com/unjs/unplugin/compare/v0.9.1...v0.9.2) (2022-08-15)


### Bug Fixes

* **types:** `transformInclude` support nullish values ([6df169f](https://github.com/unjs/unplugin/commit/6df169f054081ab2efb2ec6d17fb67a04b01d082))



## [0.9.1](https://github.com/unjs/unplugin/compare/v0.9.0...v0.9.1) (2022-08-15)


### Bug Fixes

* **types:** support required options ([53954df](https://github.com/unjs/unplugin/commit/53954df7d034ead6716ed0899022ac4d72971753))



# [0.9.0](https://github.com/unjs/unplugin/compare/v0.8.1...v0.9.0) (2022-08-06)


### Bug Fixes

* ensure consistent `id`s across hooks and bundlers ([#145](https://github.com/unjs/unplugin/issues/145)) ([335f403](https://github.com/unjs/unplugin/commit/335f403bfba35bee4e251493824786ae1689a9e7))



## [0.8.1](https://github.com/unjs/unplugin/compare/v0.8.0...v0.8.1) (2022-08-04)


### Bug Fixes

* fix webpack 4 by not using loader options ([#149](https://github.com/unjs/unplugin/issues/149)) ([b68fbc4](https://github.com/unjs/unplugin/commit/b68fbc4b702a2c8dd99eb1d77a74a765df072995))



# [0.8.0](https://github.com/unjs/unplugin/compare/v0.7.2...v0.8.0) (2022-07-26)


### Bug Fixes

* webpack and esbuild query string support ([#144](https://github.com/unjs/unplugin/issues/144)) ([24f8fa1](https://github.com/unjs/unplugin/commit/24f8fa11f1103464ba3ead05de41eef5b49fd6a4))



## [0.7.2](https://github.com/unjs/unplugin/compare/v0.7.1...v0.7.2) (2022-07-12)


### Features

* add `isEntry` flag to `resolveId` hook ([#138](https://github.com/unjs/unplugin/issues/138)) ([3b082ed](https://github.com/unjs/unplugin/commit/3b082edb47cc0babae4bd16c3918a5a773dbe539))



## [0.7.1](https://github.com/unjs/unplugin/compare/v0.7.0...v0.7.1) (2022-06-30)


### Features

* accept vite 3.0 ([c07200f](https://github.com/unjs/unplugin/commit/c07200f231b02fd162d64c5c362db3948e677f80))



# [0.7.0](https://github.com/unjs/unplugin/compare/v0.6.3...v0.7.0) (2022-06-06)


### Features

* support `this.parse`, close [#90](https://github.com/unjs/unplugin/issues/90) ([8f5c6ad](https://github.com/unjs/unplugin/commit/8f5c6ad6a7f8e1cf615da1c492482d525cd2a9b6))



## [0.6.3](https://github.com/unjs/unplugin/compare/v0.6.2...v0.6.3) (2022-05-07)


### Bug Fixes

* **webpack:** use path separator instead backslash ([#84](https://github.com/unjs/unplugin/issues/84)) ([b827bed](https://github.com/unjs/unplugin/commit/b827bed29b4644626bbf62294ba7a0ec4ad38d15))



## [0.6.2](https://github.com/unjs/unplugin/compare/v0.6.1...v0.6.2) (2022-04-14)


### Bug Fixes

* avoid rollup options being passed to vite plugin ([#63](https://github.com/unjs/unplugin/issues/63)) ([8e408a3](https://github.com/unjs/unplugin/commit/8e408a3bd02c0b9991cd96b092236320cc75ee96))



## [0.6.1](https://github.com/unjs/unplugin/compare/v0.6.0...v0.6.1) (2022-03-31)


### Bug Fixes

* **webpack:** apply slash normalization on `transformInclude` ([90d6a75](https://github.com/unjs/unplugin/commit/90d6a75f2b7018705c0a0f110231043324a93548))



# [0.6.0](https://github.com/unjs/unplugin/compare/v0.5.2...v0.6.0) (2022-03-24)


### Features

* respect resolved id instead of raw request id ([#58](https://github.com/unjs/unplugin/issues/58)) ([468da3e](https://github.com/unjs/unplugin/commit/468da3eda9d18eab02371b31560e2c4cd21373b4))



## [0.5.2](https://github.com/unjs/unplugin/compare/v0.5.1...v0.5.2) (2022-03-15)


### Bug Fixes

* esm compact of `webpack-sources` ([9edae1b](https://github.com/unjs/unplugin/commit/9edae1bd17ed1ab09dc45a858ad5f011d3120e9f))



## [0.5.1](https://github.com/unjs/unplugin/compare/v0.5.0...v0.5.1) (2022-03-15)


### Bug Fixes

* deps on `webpack-sources` instead of `webpack` ([5f14fa8](https://github.com/unjs/unplugin/commit/5f14fa8a0f6eb03f959a7860c9516494a8721d4a))



# [0.5.0](https://github.com/unjs/unplugin/compare/v0.4.0...v0.5.0) (2022-03-15)


### Features

* add context functions to more hooks, fix async hooks ([#57](https://github.com/unjs/unplugin/issues/57)) ([3bfd523](https://github.com/unjs/unplugin/commit/3bfd523aee983775287e03a4874f16205573e2ee))



# [0.4.0](https://github.com/unjs/unplugin/compare/v0.3.3...v0.4.0) (2022-03-07)


### Features

* add watch hook and context functions ([#55](https://github.com/unjs/unplugin/issues/55)) ([544e66c](https://github.com/unjs/unplugin/commit/544e66cd98dde8f8a5449a6143c115f198c5a595))



## [0.3.3](https://github.com/unjs/unplugin/compare/v0.3.2...v0.3.3) (2022-02-28)


### Bug Fixes

* filter out illegal sourcemap items ([#51](https://github.com/unjs/unplugin/issues/51)) ([6644466](https://github.com/unjs/unplugin/commit/6644466f2612295ec2b524edbeeeaffda16cea5b))



## [0.3.2](https://github.com/unjs/unplugin/compare/v0.3.1...v0.3.2) (2022-01-24)


### Features

* **esbuild:** add css preprocessor support ([#50](https://github.com/unjs/unplugin/issues/50)) ([43cfaf5](https://github.com/unjs/unplugin/commit/43cfaf506fdf2cbff679ed1f6c85dc68e511840d))



## [0.3.1](https://github.com/unjs/unplugin/compare/v0.3.0...v0.3.1) (2022-01-21)


### Bug Fixes

* avoid redefining property ([#48](https://github.com/unjs/unplugin/issues/48)) ([f6f6c09](https://github.com/unjs/unplugin/commit/f6f6c09e37dcd56a7eda21605c3c67c1beaebaf3))



# [0.3.0](https://github.com/unjs/unplugin/compare/v0.2.21...v0.3.0) (2021-12-28)


### Features

* support esbuild ([#46](https://github.com/unjs/unplugin/issues/46)) ([28557c8](https://github.com/unjs/unplugin/commit/28557c8e3cfc01983034ca214505489b1975c849))



# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.2.21](https://github.com/unjs/unplugin/compare/v0.2.20...v0.2.21) (2021-11-14)


### Bug Fixes

* webpack hook tapPromise must return Promise object ([#42](https://github.com/unjs/unplugin/issues/42)) ([f7c3fd4](https://github.com/unjs/unplugin/commit/f7c3fd476aac5022b6cc59dad5b444ed51022e91))

### [0.2.20](https://github.com/unjs/unplugin/compare/v0.2.19...v0.2.20) (2021-11-05)


### Bug Fixes

* `buildEnd` hook ([#39](https://github.com/unjs/unplugin/issues/39)) ([5dfb89a](https://github.com/unjs/unplugin/commit/5dfb89aa318b75e629aea039bf890f1ce3eb7b1f))

### [0.2.19](https://github.com/unjs/unplugin/compare/v0.2.18...v0.2.19) (2021-10-28)


### Bug Fixes

* modules uses the wrong path, close [#33](https://github.com/unjs/unplugin/issues/33) ([#35](https://github.com/unjs/unplugin/issues/35)) ([cfc9c3e](https://github.com/unjs/unplugin/commit/cfc9c3e10dece10b8c0e74946e9bf412411c85dc))

### [0.2.18](https://github.com/unjs/unplugin/compare/v0.2.17...v0.2.18) (2021-10-25)


### Features

* support buildEnd hook, close [#27](https://github.com/unjs/unplugin/issues/27) ([#34](https://github.com/unjs/unplugin/issues/34)) ([c95f42d](https://github.com/unjs/unplugin/commit/c95f42dfe9996ef89cdbbd020944469e4aeda459))

### [0.2.17](https://github.com/unjs/unplugin/compare/v0.2.16...v0.2.17) (2021-10-25)


### Bug Fixes

* try fix windows virtual module ([6edb3aa](https://github.com/unjs/unplugin/commit/6edb3aa864a3b9e1935caf6fec75203159b1da24))
* windows path resolving ([a8293b8](https://github.com/unjs/unplugin/commit/a8293b886162ce9d610f8297e281a5a4bc7e37cf))

### [0.2.16](https://github.com/unjs/unplugin/compare/v0.2.15...v0.2.16) (2021-09-25)


### Bug Fixes

* windows path resolving ([c9055aa](https://github.com/unjs/unplugin/commit/c9055aaf1fdc97139beb6b293282bdee61eba050))

### [0.2.15](https://github.com/unjs/unplugin/compare/v0.2.14...v0.2.15) (2021-09-25)


### Bug Fixes

* revert "chore: switch from `upath` to `pathe`" ([bc4e50b](https://github.com/unjs/unplugin/commit/bc4e50b5bebb8364de931c6eb8c9e585147d5747))
* virtualModulePrefix compactible for windows ([9104fa2](https://github.com/unjs/unplugin/commit/9104fa2cf74b09aa91f72b4e0c41dc1e1f1043c8))

### [0.2.14](https://github.com/unjs/unplugin/compare/v0.2.13...v0.2.14) (2021-09-24)

### [0.2.13](https://github.com/unjs/unplugin/compare/v0.2.12...v0.2.13) (2021-09-21)

### [0.2.12](https://github.com/unjs/unplugin/compare/v0.2.11...v0.2.12) (2021-09-21)


### Bug Fixes

* use `optionalDependencies` instead of `peerDependencies` ([4cc6686](https://github.com/unjs/unplugin/commit/4cc668609e2c3ba724e2fe135fb7077524dccc73))

### [0.2.11](https://github.com/unjs/unplugin/compare/v0.2.10...v0.2.11) (2021-09-16)


### Bug Fixes

* revert sourcemp handling for webpack and improve tests ([b57cf3f](https://github.com/unjs/unplugin/commit/b57cf3f2f0119e889570b5bf724c255e1385035d))

### [0.2.10](https://github.com/unjs/unplugin/compare/v0.2.9...v0.2.10) (2021-09-16)


### Bug Fixes

* cleanup sources in transform map ([17dd24a](https://github.com/unjs/unplugin/commit/17dd24a7088679f8f2cb96dd41d12b377693a008))

### [0.2.9](https://github.com/unjs/unplugin/compare/v0.2.8...v0.2.9) (2021-09-13)


### Bug Fixes

* webpack peer dependency warnings ([#21](https://github.com/unjs/unplugin/issues/21)) ([706fc99](https://github.com/unjs/unplugin/commit/706fc9965e261e710c3b194ec6f91f112db93037))

### [0.2.8](https://github.com/unjs/unplugin/compare/v0.2.7...v0.2.8) (2021-09-11)


### Features

* `resolveId` supports Rollup externals ([#18](https://github.com/unjs/unplugin/issues/18)) ([3c756dd](https://github.com/unjs/unplugin/commit/3c756ddd629501cafa13468bf0c653a32fd989b8))
* support `buildStart` hook, close [#14](https://github.com/unjs/unplugin/issues/14) ([73f550a](https://github.com/unjs/unplugin/commit/73f550ad2598313813731fcc2f135b5c29e3a86e))

### [0.2.7](https://github.com/unjs/unplugin/compare/v0.2.6...v0.2.7) (2021-09-01)


### Bug Fixes

* use default export for `unpath`, close [#10](https://github.com/unjs/unplugin/issues/10) ([5a3645a](https://github.com/unjs/unplugin/commit/5a3645ac25ebf0cb26ac75adbd567e53c57e9fe5))

### [0.2.6](https://github.com/unjs/unplugin/compare/v0.2.5...v0.2.6) (2021-08-31)


### Bug Fixes

* swtich to tsup, fix [#10](https://github.com/unjs/unplugin/issues/10) ([4450e1e](https://github.com/unjs/unplugin/commit/4450e1e18e5686f9e5a11b060ed6e36c92d4440d))

### [0.2.5](https://github.com/unjs/unplugin/compare/v0.2.4...v0.2.5) (2021-08-31)


### Bug Fixes

* __dirname mjs support, close [#10](https://github.com/unjs/unplugin/issues/10) ([2a5da06](https://github.com/unjs/unplugin/commit/2a5da067c671eb95bb1ccc8e33e94a821616dd89))

### [0.2.4](https://github.com/unjs/unplugin/compare/v0.2.3...v0.2.4) (2021-08-30)


### Bug Fixes

* **webpack:** don't load null id ([b5f68c7](https://github.com/unjs/unplugin/commit/b5f68c7afe2ebd97db0e8c09891635c174d0321f))
* **webpack:** source map handling ([76fda42](https://github.com/unjs/unplugin/commit/76fda42c53b35a95eef21e063a7174a3fe292fc5))

### [0.2.3](https://github.com/unjs/unplugin/compare/v0.2.2...v0.2.3) (2021-08-27)


### Bug Fixes

* **webpack:** loader for `load` hook only enabled for resolveId result ([4ff7681](https://github.com/unjs/unplugin/commit/4ff76818aafd718acbbeed2dcc4f262f6df6ee37))
* install vfs plugin when `load` is provided ([a33bbe3](https://github.com/unjs/unplugin/commit/a33bbe30b8e20483cf26fc68bd8a80fd1658b1ff))

### [0.2.2](https://github.com/unjs/unplugin/compare/v0.2.1...v0.2.2) (2021-08-27)


### Bug Fixes

* widen context error types ([00ea6d9](https://github.com/unjs/unplugin/commit/00ea6d9a4abf7c26a1190d8ef91aa12f2b413d8b))

### [0.2.1](https://github.com/unjs/unplugin/compare/v0.2.0...v0.2.1) (2021-08-27)


### Bug Fixes

* better source map handling for webpack ([992f322](https://github.com/unjs/unplugin/commit/992f322b8bf0812263141013e9533f42eb2fbb1e))
* types for load hook ([01a9364](https://github.com/unjs/unplugin/commit/01a9364a7a7cd1a5716b20c0448aef8ea0ab8018))

## [0.2.0](https://github.com/unjs/unplugin/compare/v0.1.0...v0.2.0) (2021-08-25)


### Features

* virtual module support for webpack ([333717b](https://github.com/unjs/unplugin/commit/333717b29757ddbf39677430929b8c73625e0711))

### [0.0.9](https://github.com/unjs/unplugin/compare/v0.0.8...v0.0.9) (2021-08-25)

### [0.0.7](https://github.com/unjs/unplugin/compare/v0.0.6...v0.0.7) (2021-08-23)


### Features

* expose context for transform hook ([aa92da9](https://github.com/unjs/unplugin/commit/aa92da9743fb926ad19a1b631e0b6c79292e1349))

### [0.0.6](https://github.com/unjs/unplugin/compare/v0.0.5...v0.0.6) (2021-08-21)


### Bug Fixes

* apply context for child compilers ([123838e](https://github.com/unjs/unplugin/commit/123838e9722792a7fc43d2476c49d6c83c3658d7))

### [0.0.5](https://github.com/unjs/unplugin/compare/v0.0.4...v0.0.5) (2021-07-27)


### Features

* expose raw object ([19a3768](https://github.com/unjs/unplugin/commit/19a37687b82994c1c2454ec118d30960a2659b85))

### [0.0.4](https://github.com/unjs/unplugin/compare/v0.0.3...v0.0.4) (2021-07-25)


### Features

* **webpack:** `load` hook initial implementation ([e671b62](https://github.com/unjs/unplugin/commit/e671b628c47694ab2e8c279f361c24eaf2a38aa7))

### [0.0.3](https://github.com/unjs/unplugin/compare/v0.0.2...v0.0.3) (2021-07-18)


### Features

* resolveId ([236738d](https://github.com/unjs/unplugin/commit/236738dee54e84651470abe2b11062917e462c40))


### Bug Fixes

* hook id ([42090cb](https://github.com/unjs/unplugin/commit/42090cbdfce89f616a6d5bfb1e84fc9edd8fe013))

### 0.0.2 (2021-07-13)


### Features

* basic transform ([74e17df](https://github.com/unjs/unplugin/commit/74e17df4122bdc47e76ee145c29e230f3b4311b0))
* factory style, close [#2](https://github.com/unjs/unplugin/issues/2) ([8f4fc53](https://github.com/unjs/unplugin/commit/8f4fc535bda57291837eef7193ea7d5bb00f0ed1))
* init webpack load support ([d8a34b4](https://github.com/unjs/unplugin/commit/d8a34b459a1d4ff49281ec807720836227af033c))
* support framework specfic plugin extends ([88fe813](https://github.com/unjs/unplugin/commit/88fe8139cfa6c4705377ece93ef1c920e3aa8d73))


### Bug Fixes

* always transform if `transformInclude` is not provided (compactible with rollup) ([624e0d3](https://github.com/unjs/unplugin/commit/624e0d32c280a08967cb19b85d1feb54ab8e9b08))
* update type ([ca83e39](https://github.com/unjs/unplugin/commit/ca83e39b6f48f898189e44eb97daec04f7259f6b))
* use options for webpack loader, close [#3](https://github.com/unjs/unplugin/issues/3) ([8273ae6](https://github.com/unjs/unplugin/commit/8273ae6c1125003cd8707558d334f0f8845a6bcc))
* webpack loader ([4f85c2a](https://github.com/unjs/unplugin/commit/4f85c2a343a630c1230dbc71275865dbf3ea7768))
