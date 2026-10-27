# Plan 008: Remove write-only internal plugin fields and unused Farm helpers; move the shared sourcemap helpers out of `src/esbuild/utils.ts`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1ea89aa..HEAD -- src/types.ts src/webpack/index.ts src/rspack/index.ts src/farm/index.ts src/farm/utils.ts src/esbuild/utils.ts src/esbuild/index.ts src/bun/index.ts src/utils/sourcemap.ts test/unit-tests/farm/utils.test.ts test/unit-tests/esbuild/utils.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none; **do this before plan 009** (consolidation is easier without the dead fields). If plan 004 already landed, Step 4's esbuild import changes are smaller.
- **Category**: tech-debt
- **Planned at**: commit `1ea89aa`, 2026-10-27

## Why this matters

Three clusters of code exist only to be written, never read:

1. `__unpluginMeta` is assigned onto every webpack and rspack plugin object but is not declared on `ResolvedUnpluginOptions` and is never read anywhere in `src/` or `test/`. The `as ResolvedUnpluginOptions` casts next to it exist partly to hide that.
2. `__vfsModules` is typed `Map<string, Promise<unknown>> | Set<string>` to serve two adapters, but webpack only ever `.add`s to it and rspack assigns it then reads a *local* `vfsModules` instead. The `Map | Set` union and the `instanceof Set` narrowing serve a field nobody reads. rspack also assigns `__vfs` (with `as any`) which only webpack's `ensureVirtualModule` reads — and that function only runs for webpack plugins.
3. `src/farm/utils.ts` exports `guessIdLoader`, `transformQuery`, `DEFAULT_PATTERN` (used only by their own tests), a `formatTransformModuleType` alias of `formatLoadModuleType`, and a `JsPluginExtended` index-signature type used once to bypass typing.

Separately, `src/bun/index.ts` imports `combineSourcemaps` and `processCodeWithSourceMap` from `../esbuild/utils` — a cross-adapter dependency that makes sourcemap fixes live in a file named for a different bundler. They belong in `src/utils/sourcemap.ts`.

None of this changes behaviour. It lowers the noise in the two largest adapter files before plan 009 reshapes them.

## Current state

### `__unpluginMeta` / `__vfsModules` / `__vfs`

- `src/types.ts:162-167`:
  ```ts
  export interface ResolvedUnpluginOptions extends UnpluginOptions {
    // injected internal objects
    __vfs?: VirtualModulesPlugin | undefined
    __vfsModules?: Map<string, Promise<unknown>> | Set<string> | undefined
    __virtualModulePrefix: string
  }
  ```
- `src/webpack/index.ts:92-99`:
  ```ts
          const plugin = Object.assign(
            rawPlugin,
            {
              __unpluginMeta: meta,
              __virtualModulePrefix: VIRTUAL_MODULE_PREFIX,
            },
          ) as ResolvedUnpluginOptions
  ```
- `src/webpack/index.ts:110-113`: `const vfsModules = new Set<string>(); plugin.__vfsModules = vfsModules; plugin.__vfs = vfs`
- `src/webpack/index.ts:63-65` (inside `ensureVirtualModule`): `plugin.__vfs.writeModule(resource, ''); if (plugin.__vfsModules instanceof Set) plugin.__vfsModules.add(resource)`
- `src/rspack/index.ts:95-102`: same `Object.assign({}, rawPlugin, { __unpluginMeta: meta, __virtualModulePrefix })`.
- `src/rspack/index.ts:114-117`: `const vfsModules = new Map<string, Promise<unknown>>(); plugin.__vfsModules = vfsModules; plugin.__vfs = vfs as any`. The Map is then used through the local `vfsModules` (lines 199-207), never via `plugin.__vfsModules`.

Verified with `grep -rn "__unpluginMeta\|__vfsModules" src test docs` — only the sites above (plus a 2022 CHANGELOG line, which stays).

### Farm helpers

- `src/farm/utils.ts:7-38`: `ExtToLoader` (farm's own table), `DEFAULT_PATTERN`, `guessIdLoader`, `transformQuery`. `grep -rn "guessIdLoader\|transformQuery\|DEFAULT_PATTERN" src` → only their definitions. Tests: `test/unit-tests/farm/utils.test.ts:24-40`.
- `src/farm/utils.ts:217-219`: `export interface JsPluginExtended extends JsPlugin { [key: string]: any }`; used at `src/farm/index.ts:17,73`:
  ```ts
    if (plugin.farm) {
      Object.keys(plugin.farm).forEach((key) => {
        const value = (plugin.farm as JsPluginExtended)[key]
        if (value)
          Reflect.set(farmPlugin, key, value)
      })
    }
  ```
- `src/farm/utils.ts:274-276`: `export function formatTransformModuleType(id) { return formatLoadModuleType(id) }`; used at `src/farm/index.ts:161,198`; tested at `test/unit-tests/farm/utils.test.ts:136-139`.
- Note: if `ExtToLoader` in farm becomes unused after removing `guessIdLoader`, delete it too (check `grep -n ExtToLoader src/farm/utils.ts`).

### Shared sourcemap helpers

- `src/esbuild/utils.ts:47-66` `fixSourceMap`, `:68-133` `nullSourceMap` + `combineSourcemaps`, `:212-221` `processCodeWithSourceMap` (which calls `fixSourceMap`).
- Consumers: `src/esbuild/index.ts:16-23` imports `combineSourcemaps` (dead after plan 004) and `processCodeWithSourceMap`; `src/bun/index.ts:7` imports `combineSourcemaps, processCodeWithSourceMap` from `'../esbuild/utils'`; `test/unit-tests/esbuild/utils.test.ts:12` imports them from `'../../../src/esbuild/utils'`.
- `src/utils/sourcemap.ts` currently holds only `mergeSourceMaps` (webpack/rspack loader composition) and already imports `remapping`.
- Type imports needed by the moved code: `DecodedSourceMap, EncodedSourceMap` from `@jridgewell/remapping`, `SourceMap` from `rollup`, `Buffer` from `node:buffer`, `path`, `fileURLToPath` from `node:url`.

### Conventions

- `tsconfig.json` has `noUnusedLocals: true`; `pnpm typecheck` catches leftover imports.
- `verbatimModuleSyntax`: type-only imports must use `import type`.
- The repo deletes tests together with the code they test (no "keep the test for history").

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Affected tests | `pnpm vitest run test/unit-tests/farm test/unit-tests/esbuild test/unit-tests/webpack test/unit-tests/rspack test/unit-tests/virtual-id` | all pass |
| Full | `pnpm build && pnpm test` | exit 0 |

## Scope

**In scope**:
- `src/types.ts` — `ResolvedUnpluginOptions` only
- `src/webpack/index.ts` — the `Object.assign`, `__vfsModules` assignments and `ensureVirtualModule`'s `.add`
- `src/rspack/index.ts` — the `Object.assign`, `__vfsModules`/`__vfs` assignments
- `src/farm/utils.ts`, `src/farm/index.ts` (the `plugin.farm` merge loop and the `formatTransformModuleType` call sites)
- `src/esbuild/utils.ts`, `src/esbuild/index.ts` (imports), `src/bun/index.ts` (imports), `src/utils/sourcemap.ts`
- `test/unit-tests/farm/utils.test.ts`, `test/unit-tests/esbuild/utils.test.ts` (imports / deleted tests), optionally a new `test/unit-tests/utils/sourcemap.test.ts` section if plan 006 created that file
- `plans/README.md`

**Out of scope**:
- `ExtToLoader`/`guessLoader`/`unwrapLoader` duplication between `src/esbuild/utils.ts` and `src/bun/utils.ts`: they are typed with *different* `Loader` unions (`esbuild` vs `bun`); unifying them means a generic or a widening cast. Not worth it.
- Any behaviour change in virtual-module handling. `vfsModules` locals stay; only the plugin-field mirrors go.
- `FakeVirtualModulesPlugin` (`src/rspack/utils.ts`) — separate decision item in `plans/README.md`.
- Merging `mergeSourceMaps` with `combineSourcemaps` — different call shapes, both tested; cosmetic.

## Git workflow

- Branch: `chore/remove-dead-internals`
- Commits: `chore: drop write-only __unpluginMeta and __vfsModules plugin fields`, `chore(farm): remove unused helpers`, `refactor: move shared sourcemap helpers to utils/sourcemap`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Remove `__unpluginMeta` and `__vfsModules`

- `src/types.ts`: delete the `__vfsModules` line. Keep `__vfs` (webpack reads it) and `__virtualModulePrefix`.
- `src/webpack/index.ts`: remove `__unpluginMeta: meta,` from the `Object.assign`; delete `const vfsModules = new Set<string>()` and `plugin.__vfsModules = vfsModules`; in `ensureVirtualModule` delete the two `__vfsModules` lines so the function ends with `plugin.__vfs.writeModule(resource, '')`.
- `src/rspack/index.ts`: remove `__unpluginMeta: meta,`; delete `plugin.__vfsModules = vfsModules` and `plugin.__vfs = vfs as any` (the local `vfsModules` Map and `vfs` stay and are still used in the resolve tap).

**Verify**: `grep -rn "__unpluginMeta\|__vfsModules" src test` → no output. `pnpm typecheck` → exit 0. `pnpm build && pnpm vitest run test/unit-tests/virtual-id test/unit-tests/webpack test/unit-tests/rspack` → all pass (virtual modules still work on both).

### Step 2: Remove unused Farm helpers

- `src/farm/utils.ts`: delete `DEFAULT_PATTERN`, `guessIdLoader`, `transformQuery`, and `ExtToLoader` if it is now unused; delete `formatTransformModuleType` and `JsPluginExtended`. Drop the now-unused `querystring` import if nothing else uses it (check `grep -n querystring src/farm/utils.ts`).
- `src/farm/index.ts`: replace `formatTransformModuleType(id)` with `formatLoadModuleType(id)` at both call sites and fix the import list; replace the `plugin.farm` merge loop with:
  ```ts
    if (plugin.farm)
      Object.assign(farmPlugin, plugin.farm)
  ```
  (This also copies falsy values, whereas the loop skipped them. `plugin.farm` is `Partial<JsPlugin>`; a user setting a hook to `undefined` explicitly would now override — acceptable and arguably more correct. If you prefer exact parity, keep the loop but iterate `Object.entries(plugin.farm)` without the cast.) Remove the `JsPluginExtended` type import.
- `test/unit-tests/farm/utils.test.ts`: delete the `guessIdLoader`, `transformQuery`, `formatTransformModuleType` tests and their imports.

**Verify**: `grep -rn "guessIdLoader\|transformQuery\|DEFAULT_PATTERN\|JsPluginExtended\|formatTransformModuleType" src test` → no output. `pnpm typecheck` → exit 0. `pnpm vitest run test/unit-tests/farm` → all pass. `pnpm test:build` → Farm fixtures still build (the `plugin.farm` merge is exercised by the fixtures only if they set `farm:`; check `grep -n "farm:" test/fixtures/*/unplugin.js` — if none do, the unit test `test/unit-tests/farm/index.test.ts` "farm: true" cases cover the merge).

### Step 3: Move the shared sourcemap helpers

- Move `fixSourceMap`, `nullSourceMap`, `combineSourcemaps`, `processCodeWithSourceMap` from `src/esbuild/utils.ts` into `src/utils/sourcemap.ts` verbatim (keep the Vite attribution comment above `nullSourceMap`), together with the imports they need. `src/utils/sourcemap.ts` keeps `mergeSourceMaps`.
- `src/esbuild/utils.ts`: remove the moved code and now-unused imports (`DecodedSourceMap`, `EncodedSourceMap`, `remapping`, `fileURLToPath`, `Buffer`, maybe `path` — `pnpm typecheck` will tell you).
- `src/esbuild/index.ts`: import `processCodeWithSourceMap` (and `combineSourcemaps` only if plan 004 has *not* landed and the dead branch still references it) from `'../utils/sourcemap'`.
- `src/bun/index.ts`: import from `'../utils/sourcemap'` instead of `'../esbuild/utils'`.
- `test/unit-tests/esbuild/utils.test.ts`: change the import source of the moved functions to `'../../../src/utils/sourcemap'`, or move those `describe` blocks into `test/unit-tests/utils/sourcemap.test.ts` if plan 006 created it.

**Verify**: `grep -rn "from '../esbuild/utils'" src/bun` → no output. `pnpm typecheck` → exit 0. `pnpm vitest run test/unit-tests/esbuild test/unit-tests/utils` (and Bun tests if `bun` is available) → all pass.

### Step 4: Lint and full run

**Verify**: `pnpm lint` → exit 0; `pnpm build && pnpm test` → exit 0.

## Test plan

No new behaviour. Deleted tests: three Farm helper tests. Moved tests: `combineSourcemaps`/`processCodeWithSourceMap`/`fixSourceMap` cases follow their functions. All remaining suites pass unchanged.

## Done criteria

- [ ] `grep -rn "__unpluginMeta\|__vfsModules\|guessIdLoader\|transformQuery\|DEFAULT_PATTERN\|JsPluginExtended\|formatTransformModuleType" src test` → nothing
- [ ] `grep -n "combineSourcemaps\|processCodeWithSourceMap\|fixSourceMap" src/esbuild/utils.ts` → nothing; same names present in `src/utils/sourcemap.ts`
- [ ] `grep -rn "esbuild/utils" src/bun` → nothing
- [ ] `pnpm typecheck`, `pnpm lint` exit 0
- [ ] `pnpm build && pnpm test` exits 0
- [ ] `git diff --stat` shows a net negative line count
- [ ] Only in-scope files modified; `plans/README.md` updated

## STOP conditions

- `grep` finds a reader of `__unpluginMeta` or `__vfsModules` that this plan didn't list.
- Removing `plugin.__vfs = vfs as any` in rspack breaks a test — it would mean something reads `__vfs` on rspack plugins; report.
- The moved sourcemap code needs a change to typecheck in its new home (it should be a pure move).

## Maintenance notes

- Plan 009 consolidates webpack/rspack; it should not reintroduce plugin-object mirrors of adapter-local state.
- Reviewers: Step 2's `Object.assign(farmPlugin, plugin.farm)` is the one place with a (tiny) semantic difference; confirm the test suite's `farm: true` cases still pass and that no fixture relies on skipping falsy overrides.
