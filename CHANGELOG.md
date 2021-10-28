# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
