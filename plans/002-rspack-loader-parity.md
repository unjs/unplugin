# Plan 002: Bring the rspack loaders and `buildEnd` to parity with webpack (binary pass-through, processAssets stage)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1ea89aa..HEAD -- src/rspack/loaders/load.ts src/rspack/loaders/transform.ts src/rspack/index.ts test/unit-tests/rspack/loaders/load.test.ts test/unit-tests/rspack/loaders/transform.test.ts test/unit-tests/build-end/build-end.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-test-harness.md (for `runRspack` rejecting on build errors; also run `pnpm build` before integration tests)
- **Category**: bug
- **Planned at**: commit `1ea89aa`, 2026-10-27

## Why this matters

Commit `61597b7` ("fix(webpack): keep binary files intact in the load and transform loaders", #623, fixes #524) made the two webpack loaders *raw* loaders so that images and fonts the hook doesn't handle are passed on as a `Buffer` instead of being decoded as UTF-8 text and corrupted. The rspack loaders are near-copies of the webpack ones and were not changed, so every rspack and Rsbuild user with an unfiltered `load` or `transform` hook still gets corrupted binary assets. Separately, commit `22727e5` (#619) moved webpack's `buildEnd` from `compiler.hooks.emit` to the `processAssets` compilation hook so plugins can `emitFile` from `buildEnd`; rspack still taps `emit`, where `emitAsset` is too late. Both are one-sided fixes that should have landed on both adapters.

## Current state

Files:

- `src/rspack/loaders/load.ts` (48 lines) — rspack load loader; receives the plugin via `this.query.plugin`.
- `src/rspack/loaders/transform.ts` (75 lines) — rspack transform loader.
- `src/webpack/loaders/load.ts`, `src/webpack/loaders/transform.ts` — the already-fixed webpack twins. **Use these as the reference implementation.**
- `src/rspack/index.ts:287-291` — `buildEnd` wiring on `compiler.hooks.emit`.
- `src/webpack/index.ts:296-313` — webpack `buildEnd` wiring on `processAssets` with `emit` fallback.
- `test/unit-tests/rspack/loaders/{load,transform}.test.ts` — mock-loader-context unit tests; import loader source directly (no build needed).
- `test/unit-tests/webpack/loaders/{load,transform}.test.ts` — contain the binary tests to port (`load.test.ts:83-108`, `transform.test.ts:222-270`).
- `test/unit-tests/build-end/build-end.test.ts` — webpack-only `buildEnd` → `emitFile` integration test; extend to rspack.

### Excerpt: `src/webpack/loaders/load.ts:1-21` (target shape)

```ts
import type { Buffer } from 'node:buffer'
import type { LoaderContext } from 'webpack'
import type { ResolvedUnpluginOptions } from '../../types'
import { normalizeAbsolutePath } from '../../utils/webpack-like'
import { createBuildContext, createContext } from '../context'

// Receive the source as a Buffer. Without this, webpack decodes every file it passes through
// this loader as UTF-8 text, which corrupts binary files (images, fonts) the load hook ignores.
// https://webpack.js.org/api/loaders/#raw-loader
export const raw = true

export default async function load(this: LoaderContext<any>, source: string | Buffer, map: any): Promise<void> {
  const callback = this.async()
  const { plugin } = this.query as { plugin: ResolvedUnpluginOptions }
  let id = this.resource

  if (!plugin?.load || !id)
    return callback(null, source, map)
```

### Excerpt: `src/rspack/loaders/load.ts:1-13` (current)

```ts
import type { LoaderContext } from '@rspack/core'
import type { ResolvedUnpluginOptions } from '../../types'
import { normalizeAbsolutePath } from '../../utils/webpack-like'
import { createBuildContext, createContext } from '../context'
import { decodeVirtualModuleId, isVirtualModuleId } from '../utils'

export default async function load(this: LoaderContext, source: string, map: any): Promise<void> {
  const callback = this.async()
  const { plugin } = this.query as { plugin: ResolvedUnpluginOptions }

  let id = this.resource
  if (!plugin?.load || !id)
    return callback(null, source, map)
```

### Excerpt: `src/webpack/loaders/transform.ts:14-48` (target shape for transform)

```ts
// Receive the source as a Buffer so that files the transform hook does not handle, like images and
// fonts, are passed on byte for byte instead of being decoded as UTF-8 text.
// https://webpack.js.org/api/loaders/#raw-loader
export const raw = true

export default async function transform(this: LoaderContext<any>, source: string | Buffer, map: any): Promise<void> {
  const callback = this.async()

  const { plugin } = this.query as { plugin: ResolvedUnpluginOptions }
  if (!plugin?.transform)
    return callback(null, source, map)
  // ... (filter memoisation unchanged) ...
  const { filter } = cached
  const code = typeof source === 'string'
    ? source
    : source.toString('utf-8')
  if (!filter(this.resource, code))
    return callback(null, source, map)

  try {
    const res = await handler.call(
      Object.assign({}, createBuildContext({ ... }, this._compiler!, this._compilation, this, map), context),
      code,
      this.resource,
    )
```

The rspack version at `src/rspack/loaders/transform.ts:13-54` is identical except: no `raw`, `source: string`, it passes `source` (not `code`) to `filter` and `handler`, and it builds the context as `this._compilation && createBuildContext(this._compiler, this._compilation, this, map)`. Keep the rspack context construction as is — only the source handling changes.

### Excerpt: `src/rspack/index.ts:287-291` (current `buildEnd`)

```ts
    if (plugin.buildEnd) {
      compiler.hooks.emit.tapPromise(plugin.name, async (compilation) => {
        await plugin.buildEnd!.call(createBuildContext(compiler, compilation))
      })
    }
```

### Excerpt: `src/webpack/index.ts:296-313` (target shape)

```ts
          if (plugin.buildEnd) {
            const processAssetsStage = (compiler as any).webpack?.Compilation?.PROCESS_ASSETS_STAGE_ADDITIONAL
            if (processAssetsStage == null) {
              compiler.hooks.emit.tapPromise(plugin.name, async (compilation) => {
                await plugin.buildEnd!.call(createBuildContext(contextOptionsFromCompilation(compilation), compiler, compilation))
              })
            }
            else {
              compiler.hooks.thisCompilation.tap(plugin.name, (compilation) => {
                compilation.hooks.processAssets.tapPromise({
                  name: plugin.name,
                  stage: processAssetsStage,
                }, async () => {
                  await plugin.buildEnd!.call(createBuildContext(contextOptionsFromCompilation(compilation), compiler, compilation))
                })
              })
            }
          }
```

For rspack, `compiler.rspack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL` is typed (no `as any` needed) and always present on supported rspack versions, so the `emit` fallback is unnecessary: tap `thisCompilation` → `compilation.hooks.processAssets.tapPromise({ name, stage }, …)` unconditionally.

### Excerpt: the test to port, `test/unit-tests/webpack/loaders/load.test.ts:83-108`

```ts
  it('should be a raw loader so binary files are not decoded as text', () => {
    expect(raw).toBe(true)
  })

  it('should pass a binary source on untouched when the load hook does not handle it', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0xFF, 0xFE, 0x00])
    mockLoaderContext.query.plugin.load = vi.fn().mockResolvedValue(null)
    mockLoaderContext.resource = '/virtual/image.png'

    await load.call(mockLoaderContext as any, png, undefined)

    const [, passedSource] = mockCallback.mock.calls.at(-1)!
    expect(Buffer.isBuffer(passedSource) && passedSource.equals(png)).toBe(true)
  })
```

(The webpack file lists the bytes one per line because of the lint rule; copy that formatting.)

### Excerpt: `test/unit-tests/build-end/build-end.test.ts:14-58` — webpack `buildEnd` emits an asset; uses a `beforeEmitPlugin` that taps `compiler.hooks.emit` to assert `buildEnd` ran *before* emit. Model the rspack test on it; `@rspack/core`'s `Compiler` has the same `hooks.emit`.

### Conventions

- Match the webpack files line for line where the logic is the same; the two adapters are intentionally parallel.
- Rspack's `LoaderContext` type is non-generic (`LoaderContext`), unlike webpack's `LoaderContext<T>`. Keep the rspack typing.
- Import `Buffer` as a type only: `import type { Buffer } from 'node:buffer'` (webpack file does this; `verbatimModuleSyntax` is on).
- Rspack honours the `raw` export the same way webpack does (its loader-runner is a port).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Build (needed before integration tests; rebuild after editing loaders) | `pnpm build` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Loader unit tests | `pnpm vitest run test/unit-tests/rspack/loaders` | all pass |
| buildEnd integration test | `pnpm build && pnpm vitest run test/unit-tests/build-end` | all pass |
| Full suite | `pnpm test` | exit 0 |

## Scope

**In scope**:
- `src/rspack/loaders/load.ts`
- `src/rspack/loaders/transform.ts`
- `src/rspack/index.ts` — only the `if (plugin.buildEnd)` block
- `test/unit-tests/rspack/loaders/load.test.ts`
- `test/unit-tests/rspack/loaders/transform.test.ts`
- `test/unit-tests/build-end/build-end.test.ts`
- `plans/README.md`

**Out of scope**:
- `src/webpack/**` — already correct; this plan copies *from* it.
- `src/rspack/utils.ts`, `src/rspack/context.ts` — no change needed.
- Deduplicating webpack and rspack code — that is plan 009. Do not extract shared helpers here; the duplication is accepted for now so this fix stays small and reviewable.
- `docs/` — no doc change needed.

## Git workflow

- Branch: `fix/rspack-loader-parity`
- Commits: `fix(rspack): keep binary files intact in the load and transform loaders`, `fix(rspack): allow emitting assets from buildEnd`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Port the binary tests to the rspack loader tests (they should fail first)

In `test/unit-tests/rspack/loaders/load.test.ts`:
- Change the import to `import load, { raw } from '../../../../src/rspack/loaders/load'`.
- Add the two tests from the webpack excerpt above, adapted to this file's mock-context style (this file builds the `this` object inline per test rather than a shared `mockLoaderContext`; follow the local style).

In `test/unit-tests/rspack/loaders/transform.test.ts`:
- Import `raw` alongside the default export.
- Add three tests mirroring `test/unit-tests/webpack/loaders/transform.test.ts:222-270`: `raw` is `true`; a `Buffer` source is passed on untouched when the filter does not match (use a real filter object such as `filter: { id: /\.never$/ }` plus `expect(handler).not.toHaveBeenCalled()` — see plan 001 Step 6 for why `vi.fn()` filters don't filter); the handler receives a string when given a `Buffer`.

**Verify**: `pnpm vitest run test/unit-tests/rspack/loaders` → the new tests **fail** (`raw` is undefined; handler receives a Buffer). Existing tests still pass.

### Step 2: Make both rspack loaders raw

`src/rspack/loaders/load.ts`:
- Add `import type { Buffer } from 'node:buffer'`.
- Add `export const raw = true` with the same two-line comment as the webpack file (adjust "webpack" → "rspack").
- Change the signature to `source: string | Buffer`.
- No other change: the load loader never reads `source` except to pass it back.

`src/rspack/loaders/transform.ts`:
- Same import, `raw` export and comment.
- Signature `source: string | Buffer`.
- After obtaining `filter`, compute `const code = typeof source === 'string' ? source : source.toString('utf-8')` and use `code` for both `filter(this.resource, code)` and the handler argument; keep passing the original `source` back in every `callback(null, source, map)` pass-through.

**Verify**: `pnpm vitest run test/unit-tests/rspack/loaders` → all pass, including the new ones. `pnpm typecheck` → exit 0.

### Step 3: Move rspack `buildEnd` to `processAssets`

Replace the block at `src/rspack/index.ts:287-291` with:

```ts
    if (plugin.buildEnd) {
      compiler.hooks.thisCompilation.tap(plugin.name, (compilation) => {
        compilation.hooks.processAssets.tapPromise({
          name: plugin.name,
          stage: compiler.rspack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        }, async () => {
          await plugin.buildEnd!.call(createBuildContext(compiler, compilation))
        })
      })
    }
```

If `compiler.rspack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL` is not in the installed `@rspack/core` types, STOP (see below) rather than casting.

**Verify**: `pnpm typecheck` → exit 0.

### Step 4: Extend the `buildEnd` integration test to rspack

In `test/unit-tests/build-end/build-end.test.ts`, add `it('rspack allows emitting assets from buildEnd', …)` mirroring the webpack test: a before-emit plugin tapping `compiler.hooks.emit`, an unplugin whose `buildEnd` asserts `emitStarted === false` and calls `this.emitFile({ type: 'asset', fileName: 'build-end.json', source: '{"emitted":true}' })`, run through `runRspack` from `../utils` (added by plan 001; if it does not exist yet, inline the `hasErrors` check exactly as the webpack test does at lines 34-55). Output to a distinct subdirectory, e.g. `path.join(outputPath, 'rspack')`, so the two tests don't collide. Assert the emitted file's contents.

**Verify**: `pnpm build && pnpm vitest run test/unit-tests/build-end` → 2 tests pass. To prove the test is meaningful, temporarily revert Step 3 and confirm the rspack test fails (the asset is missing or `emitStarted` is true); re-apply Step 3.

### Step 5: Lint and full run

**Verify**: `pnpm lint` → exit 0; `pnpm test` → exit 0.

## Test plan

New tests (all listed above):
- `rspack/loaders/load.test.ts`: `raw === true`; binary pass-through when hook returns `null`.
- `rspack/loaders/transform.test.ts`: `raw === true`; binary pass-through when filter does not match (handler not called); handler receives a string from a `Buffer`.
- `build-end/build-end.test.ts`: rspack `buildEnd` can `emitFile` and runs before `emit`.

Pattern files: `test/unit-tests/webpack/loaders/*.test.ts`, `test/unit-tests/build-end/build-end.test.ts`.

## Done criteria

- [ ] `grep -n "export const raw = true" src/rspack/loaders/load.ts src/rspack/loaders/transform.ts` → 2 matches
- [ ] `grep -n "hooks.emit" src/rspack/index.ts` → no match in the `buildEnd` block (the `writeBundle` block uses `afterEmit`, which is fine)
- [ ] `pnpm typecheck` exits 0; `pnpm lint` exits 0
- [ ] `pnpm vitest run test/unit-tests/rspack/loaders test/unit-tests/build-end` → all pass, ≥ 6 new tests
- [ ] `pnpm test` exits 0
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- The rspack loader files no longer resemble the excerpts (someone may have already ported the fix).
- `compiler.rspack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL` does not typecheck against the installed `@rspack/core` — report the available API rather than casting to `any`.
- The new rspack `buildEnd` test fails with `emitStarted === true` even after Step 3 — the stage semantics differ from webpack; report.
- The binary pass-through unit test passes *before* Step 2 (would mean `raw` isn't what controls it in rspack).

## Maintenance notes

- Any future change to `src/webpack/loaders/*` must be mirrored in `src/rspack/loaders/*` until plan 009 collapses them onto a shared core. Reviewers: when a PR touches one pair, ask for the other.
- The `type: 'javascript/auto'` on the rspack load rule (`src/rspack/index.ts:221-246`) was *not* changed here; whether it wrongly overrides JSON/CSS module types for unfiltered `load` hooks is an open investigation item in `plans/README.md`.
