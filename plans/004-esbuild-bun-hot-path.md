# Plan 004: Fix the esbuild and Bun per-module hot path (empty results, read-after-filter, filters normalised once, scoped watch files, dead map branch, Bun setup crash)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1ea89aa..HEAD -- src/esbuild/index.ts src/esbuild/utils.ts src/bun/index.ts src/utils/filter.ts test/unit-tests/esbuild test/unit-tests/bun test/unit-tests/filter`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (plan 001 recommended first so `pnpm test:unit` exists)
- **Category**: bug / perf
- **Planned at**: commit `1ea89aa`, 2026-10-27

## Why this matters

The esbuild adapter runs a per-module `onLoad`/`onTransform` pipeline that has accumulated six independent problems, all in the same ~150 lines, and the Bun adapter (modelled on it) shares two of them:

1. **Empty-string results are discarded.** A `load` or `transform` hook that returns `''` (stubbing a module out, stripping a file) is treated as "no result" because the code checks `if (code)` and `result?.contents` for truthiness. On every other adapter `''` is a valid result. Bun already does this right with an explicit `hasResult` flag.
2. **Every module is read from disk before the id filter runs.** `onTransform` calls `args.getContents()` (a `readFile`) and only then checks `filter(id, code)`. A plugin with `transform: { filter: { id: /\.vue$/ } }` therefore reads every JS file in the graph, returns `undefined`, and esbuild reads it again. Bun does the same with `Bun.file(id).text()`.
3. **Filters are recompiled per module.** `normalizeObjectHook` (which compiles picomatch matchers for string globs) is called inside the `onResolve`/`onLoad`/`onTransform` callbacks instead of once at setup. Rollup, Bun, webpack and rspack already normalise once.
4. **`watchFiles` is one build-lifetime array.** `createBuildContext` holds a single `watchFiles` array; every hook result returns it by reference as `watchFiles`, so in `context.watch()` every module depends on every file any hook ever added, and the array grows forever.
5. **Dead source-map branch.** In `onTransform`, `let map` is declared and never assigned before `if (map && result.map)`, so the `combineSourcemaps` branch is unreachable, and inside it `result.map === 'string'` compares a map to the literal string `'string'`.
6. **Bun crashes at setup** when a plugin sets `transformInclude` without `transform`: the filter admits the plugin but `normalizeObjectHook('transform', undefined)` then dereferences `.handler` on `undefined`.

## Current state

Files:

- `src/esbuild/index.ts` — the esbuild adapter. `getEsbuildPlugin` (lines 52-165) aggregates per-plugin `onLoad`/`onTransform` callbacks into one esbuild `onLoad`; `buildSetup` (167-347) wires the hooks for one plugin.
- `src/esbuild/utils.ts` — `createBuildContext` (135-160), `createPluginContext` (162-189), `combineSourcemaps`, `processCodeWithSourceMap`.
- `src/bun/index.ts` — Bun adapter; hooks normalised once at setup (lines 60-79), load/transform pipeline (150-275).
- `src/utils/filter.ts` — `normalizeObjectHook(name, hook)` returns `{ handler, filter }`; for `'transform'` the filter is `(id, code) => boolean`.
- Tests: `test/unit-tests/esbuild/{index,utils}.test.ts`, `test/unit-tests/bun/*.test.ts` (Bun tests only run under the Bun runtime; `onlyBun` in `test/utils.ts`), `test/unit-tests/filter/filter.test.ts` (cross-bundler filter integration, includes `esbuild`).

### Excerpt: `src/esbuild/index.ts:93-102` and `:145-152` (truthiness checks — problem 1)

```ts
          let result: OnLoadResult | null | undefined
          for (const { options, onLoadCb } of loaders) {
            if (!checkFilter(options))
              continue

            if (onLoadCb)
              result = await onLoadCb!(args)
            if (result?.contents)
              break
          }
          // ...
              const _result = await onTransformCb(newArgs)
              if (_result?.contents)
                result = _result
            }
          }

          if (result?.contents)
            return result
```

Also `:115-117` inside `getContents()`: `if (result?.contents) return result.contents as string`.

### Excerpt: `src/esbuild/index.ts:286-341` (problems 1, 2, 3, 5)

```ts
      if (plugin.transform) {
        onTransform({ filter: onLoadFilter }, async (args) => {
          const { handler, filter } = normalizeObjectHook('transform', plugin.transform!)   // per module

          const id = args.path + (args.suffix || '')
          if (plugin.transformInclude && !plugin.transformInclude(id))
            return
          let code = await args.getContents()          // disk read BEFORE id filter
          if (!filter(id, code))
            return

          const { mixedContext, errors, warnings } = createPluginContext(context)
          const resolveDir = path.dirname(args.path)

          let map: SourceMap | null | undefined        // never assigned before the check below
          const result = await handler.call(mixedContext, code, id)
          if (typeof result === 'string') {
            code = result
          }
          else if (typeof result === 'object' && result !== null) {
            code = result.code
            // if we already got sourcemap from `load()`,
            // combine the two sourcemaps
            if (map && result.map) {                   // unreachable
              map = combineSourcemaps(args.path, [
                result.map === 'string'                // typo: compares to the literal 'string'
                  ? JSON.parse(result.map)
                  : result.map as RawSourceMap,
                map as RawSourceMap,
              ]) as SourceMap
            }
            else {
              if (typeof result.map === 'string') {
                map = JSON.parse(result.map)
              }
              else {
                // otherwise, we always keep the last one, even if it's empty
                map = result.map as SourceMap
              }
            }
          }

          if (code) {                                  // '' is dropped
            if (map)
              code = processCodeWithSourceMap(map, code)
            return { contents: code, errors, warnings, watchFiles: mixedContext.getWatchFiles(), loader: unwrapLoader(loader, code, args.path), resolveDir }
          }
        })
      }
```

`onResolve` (line 202) and `onLoad` (line 243) have the same per-module `normalizeObjectHook` call.

### Excerpt: `src/esbuild/utils.ts:135-142` and `:170-180` (problem 4)

```ts
export function createBuildContext(build: PluginBuild): UnpluginBuildContext {
  const watchFiles: string[] = []
  const { initialOptions } = build
  return {
    parse,
    addWatchFile() {
      throw new Error('unplugin/esbuild: addWatchFile outside supported hooks (resolveId, load, transform)')
    },
    // ...
    getWatchFiles() {
      return watchFiles
    },
// ...
  const mixedContext: UnpluginContext & UnpluginBuildContext = {
    ...context,
    ...pluginContext,
    addWatchFile(id: string) {
      context.getWatchFiles().push(id)      // pushes into the build-lifetime array
    },
  }
```

The existing test `test/unit-tests/esbuild/utils.test.ts:194-208` constructs `createPluginContext({ getWatchFiles: () => watchFiles })` and asserts `addWatchFile('id')` lands in *that* array — this test encodes the current (wrong) coupling and must be updated.

### Excerpt: `src/bun/index.ts:74-79` (problem 6) and `:198-211` (problem 2)

```ts
        const transformHooks = plugins
          .filter(plugin => plugin.transform || plugin.transformInclude)   // admits transformInclude-only
          .map(plugin => ({
            plugin,
            ...normalizeObjectHook('transform', plugin.transform!),        // hook undefined → throws
          }))
// ...
          if (!hasResult && namespace === 'file' && transformHooks.length > 0) {
            code = await Bun.file(id).text()        // read before any transform filter is consulted
          }

          if (code !== undefined) {
            const namespaceTransformHooks = namespace === 'file'
              ? transformHooks
              : transformHooks.filter(h => h.plugin.name === namespace)

            for (const { plugin, handler, filter } of namespaceTransformHooks) {
              if (plugin.transformInclude && !plugin.transformInclude(id))
                continue
              if (!filter(id, code))
                continue
```

### Excerpt: `src/utils/filter.ts:142-160` and `:181-199` (where the id-only predicate lives)

```ts
function createFilterForTransform(
  idFilter: StringFilter | undefined,
  codeFilter: StringFilter | undefined,
): TransformHookFilter | undefined {
  if (!idFilter && !codeFilter)
    return
  const idFilterFunction = createIdFilter(idFilter)
  const codeFilterFunction = createCodeFilter(codeFilter)
  return (id, code) => {
    let fallback = true
    if (idFilterFunction) {
      fallback &&= idFilterFunction(id)
    }
    if (!fallback) {
      return false
    }

    if (codeFilterFunction) {
      fallback &&= codeFilterFunction(code)
    }
    return fallback
  }
}
// ...
  if (typeof hook === 'function') {
    handler = hook
  }
  else {
    handler = hook.handler
    const hookFilter = hook.filter
    if (name === 'resolveId' || name === 'load') {
      filter = createFilterForId(hookFilter?.id)
    }
    else {
      const transformFilter = hookFilter as HookFilter | undefined
      filter = createFilterForTransform(transformFilter?.id, transformFilter?.code)
    }
  }

  return {
    handler,
    filter: filter || (() => true),
  }
```

### Conventions

- Bun already demonstrates the target style for "has result" tracking: `let code: string | undefined; let hasResult = false` (`src/bun/index.ts:151-152`).
- Rollup demonstrates "normalise once at setup": `src/rollup/index.ts:34,50,69` call `normalizeObjectHook` outside the hook function.
- Lint forbids unused imports (`noUnusedLocals`); if `combineSourcemaps`/`RawSourceMap` become unused in `src/esbuild/index.ts`, remove the imports.
- Comments: keep the few that explain *why* (e.g. the `#427` compat note); delete comments that describe removed code.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| esbuild + filter tests | `pnpm vitest run test/unit-tests/esbuild test/unit-tests/filter` | all pass |
| Bun tests (only if `bun` is installed) | `bun -b vitest run --allowOnly test/unit-tests/bun` | all pass |
| Fixtures through esbuild | `pnpm test:build transform esbuild` (after plan 001) or `pnpm test:build` | exit 0 |
| Full suite | `pnpm build && pnpm test` | exit 0 |

If `bun` is not available in your environment, say so in the report; the Bun changes are then verified by typecheck + lint + the Node-side logic review only.

## Scope

**In scope**:
- `src/esbuild/index.ts`
- `src/esbuild/utils.ts` — `createBuildContext` and `createPluginContext` only
- `src/bun/index.ts` — the `transformHooks` construction and the `Bun.file(id).text()` read only
- `src/utils/filter.ts` — add an `idFilter` to the `'transform'` return value only
- `test/unit-tests/esbuild/index.test.ts`, `test/unit-tests/esbuild/utils.test.ts`
- `test/unit-tests/filter/filter.test.ts` (add empty-string cases for esbuild; optionally for other bundlers)
- `test/unit-tests/bun/index.test.ts` or `test/unit-tests/bun/utils.test.ts` for the Bun setup-crash test
- `plans/README.md`

**Out of scope**:
- `src/farm/**` (plan 005), `src/webpack/**`, `src/rspack/**`, `src/rollup/**`.
- Glob escaping in `src/utils/filter.ts` (plan 006). You are only adding `idFilter` to the return; do not touch `getMatcherString`/`patternToIdFilter`.
- Bun's `watchFiles` array in `src/bun/utils.ts` — `Bun.build` has no watch mode, so it is a harmless holder; leave it.
- Actually composing `load` and `transform` source maps on esbuild. The dead branch is deleted, not revived; the `load` map is already inlined into `code` via `processCodeWithSourceMap` at line 268-269, and esbuild reads inline maps.
- `combineSourcemaps` itself — it is live for Bun; only its *esbuild import* goes away if unused.

## Git workflow

- Branch: `fix/esbuild-bun-hot-path`
- Suggested commits (one per step group): `fix(esbuild): keep empty-string load and transform results`, `perf(esbuild,bun): check the id filter before reading module contents`, `perf(esbuild): normalize hook filters once per build`, `fix(esbuild): scope watch files to the hook call that added them`, `chore(esbuild): remove unreachable sourcemap composition branch`, `fix(bun): ignore transformInclude without a transform hook`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Expose an id-only predicate from `normalizeObjectHook('transform', …)`

In `src/utils/filter.ts`:
- Change `createFilterForTransform` to accept the already-created `idFilterFunction: PluginFilter | undefined` instead of the raw `idFilter: StringFilter | undefined` (so the id filter is compiled once), or keep its signature and additionally compute `createFilterForId(transformFilter?.id)` in `normalizeObjectHook` — either is fine; prefer compiling once.
- Extend the `'transform'` overload and the implementation return type so the transform case returns `{ handler: T, filter: TransformHookFilter, idFilter: PluginFilter }`, where `idFilter` is the id-only predicate or `() => true` when there is no id filter (and `() => true` for function hooks). The `'resolveId'`/`'load'` overloads are unchanged.

Target overload:

```ts
export function normalizeObjectHook<T extends (...args: any[]) => any>(
  name: 'transform',
  hook: Hook<T, HookFilter>,
): { handler: T, filter: TransformHookFilter, idFilter: PluginFilter }
```

**Verify**: `pnpm typecheck` → exit 0 (existing callers destructure `{ handler, filter }` and ignore the new field). `pnpm vitest run test/unit-tests/filter test/unit-tests/rspack/loaders test/unit-tests/webpack/loaders` → all pass.

### Step 2: Failing test — esbuild keeps empty-string results

In `test/unit-tests/filter/filter.test.ts` (or a new `describe` in `test/unit-tests/esbuild/index.test.ts` using the existing `buildFixture` helper), add an esbuild build where a `transform` hook returns `''` for the entry and assert the output **does not** contain a token from the original source. Add a second case where `load` returns `''` for a resolved virtual id and assert the build succeeds and the output doesn't contain the token. Use `write: false` and read `result.outputFiles[0].text`.

**Verify**: `pnpm vitest run test/unit-tests/esbuild` → new tests **fail** (original token still present / ENOENT).

### Step 3: Replace truthiness checks with explicit "has result" tracking in esbuild

In `src/esbuild/index.ts` aggregated `onLoad` (lines 93-152): track `let result: OnLoadResult | undefined` and treat `result !== undefined && result !== null && result.contents !== undefined` as "has contents". Concretely: replace each `result?.contents` / `_result?.contents` truthiness check with `result?.contents != null` (i.e. `!== undefined && !== null`), including inside `getContents()`. In `onTransform` (line 328), replace `if (code) {` with `if (code !== undefined) {`.

**Verify**: `pnpm vitest run test/unit-tests/esbuild test/unit-tests/filter` → all pass including Step 2's tests.

### Step 4: Normalise hooks once per plugin setup and check the id filter before reading

In `buildSetup` (`src/esbuild/index.ts:167-347`), hoist the three `normalizeObjectHook(...)` calls out of the callbacks to just before each `if (plugin.resolveId)` / `if (plugin.load)` / `if (plugin.transform)` block (or inside the `if`, before `onResolve`/`onLoad`/`onTransform` is registered). For transform, destructure `{ handler, filter, idFilter }`.

Reorder `onTransform` to:

```ts
          const id = args.path + (args.suffix || '')
          if (plugin.transformInclude && !plugin.transformInclude(id))
            return
          if (!idFilter(id))
            return
          let code = await args.getContents()
          if (!filter(id, code))
            return
```

Add a test in `test/unit-tests/esbuild/index.test.ts` that spies on `fs.promises.readFile` (the file already does this at lines 36-70) and asserts that with `transform: { filter: { id: /\.never$/ }, handler }` the fixture's JS files are **not** read by unplugin (`readFileSpy.mock.calls` filtered to the fixture dir is empty; esbuild itself reads via Go, not `fs.promises`).

**Verify**: `pnpm vitest run test/unit-tests/esbuild test/unit-tests/filter` → all pass; the read-count test fails if you temporarily move the `getContents()` call back above `idFilter`.

### Step 5: Scope `watchFiles` per hook invocation

In `src/esbuild/utils.ts`:
- `createBuildContext`: remove the `watchFiles` array; `getWatchFiles()` returns `[]` (the build-level context is only used for `buildStart`/`buildEnd`/`esbuild.config`, where `addWatchFile` throws anyway).
- `createPluginContext`: create `const watchFiles: string[] = []` and override **both** `addWatchFile(id) { watchFiles.push(id) }` and `getWatchFiles() { return watchFiles }` on `mixedContext`.

Update `test/unit-tests/esbuild/utils.test.ts:194-208` so it asserts `actual.mixedContext.getWatchFiles()` contains `'id'` after `addWatchFile('id')`, and that a second `createPluginContext(context)` starts empty. Remove the now-meaningless outer `watchFiles` array from that test.

**Verify**: `pnpm vitest run test/unit-tests/esbuild` → all pass. Also `pnpm vitest run test/unit-tests/resolve-id` passes (it asserts `addWatchFile` exists on the esbuild hook context).

### Step 6: Delete the unreachable source-map branch

In `onTransform`, replace the `if (map && result.map) { … } else { … }` block with just the `else` body:

```ts
            map = typeof result.map === 'string'
              ? JSON.parse(result.map)
              : result.map as SourceMap
```

Remove the `let map` declaration's now-redundant `null` initialisation only if lint asks. Remove the `combineSourcemaps` and `RawSourceMap` imports from `src/esbuild/index.ts` if they become unused (check with `pnpm lint`/`pnpm typecheck`). Do not touch `combineSourcemaps` in `src/esbuild/utils.ts` (Bun uses it).

**Verify**: `pnpm typecheck` → exit 0; `pnpm lint` → exit 0; `grep -n "combineSourcemaps" src/esbuild/index.ts` → no match.

### Step 7: Bun — ignore `transformInclude` without `transform`, and read after the id filter

In `src/bun/index.ts`:
- Change the `transformHooks` filter to `.filter(plugin => plugin.transform)` and destructure `idFilter` from `normalizeObjectHook('transform', plugin.transform!)` (the spread already carries it).
- Replace the unconditional read with:

```ts
          if (!hasResult && namespace === 'file') {
            const wanted = transformHooks.some(({ plugin, idFilter }) =>
              (!plugin.transformInclude || plugin.transformInclude(id)) && idFilter(id))
            if (wanted)
              code = await Bun.file(id).text()
          }
```

Add a test (in `test/unit-tests/bun/index.test.ts`, following its existing `createUnplugin(...).bun()` + `Bun.build` style) that a plugin with only `transformInclude` and no `transform` does not throw during `setup`. Guard with the file's existing Bun-only mechanism.

**Verify**: `pnpm typecheck` → exit 0. If Bun is available: `bun -b vitest run --allowOnly test/unit-tests/bun` → all pass.

### Step 8: Lint and full run

**Verify**: `pnpm lint` → exit 0; `pnpm build && pnpm test` → exit 0.

## Test plan

New tests:
- esbuild: `transform` returning `''` removes the original code; `load` returning `''` for a virtual id builds successfully (Step 2).
- esbuild: no `fs.promises.readFile` of fixture files when the transform id filter rejects them (Step 4).
- esbuild utils: `createPluginContext` tracks its own watch files; two contexts are independent (Step 5).
- Bun: `transformInclude` without `transform` does not throw at setup (Step 7).
- Pattern files: `test/unit-tests/esbuild/index.test.ts` (`buildFixture`, `readFileSpy`), `test/unit-tests/filter/filter.test.ts` (`it('esbuild', …)`), `test/unit-tests/esbuild/utils.test.ts`.

## Done criteria

- [ ] `grep -n "if (code) {" src/esbuild/index.ts` → no match; `grep -n "result?.contents)" src/esbuild/index.ts` → no truthiness-only checks remain (each is `!= null` or `!== undefined`)
- [ ] `grep -c "normalizeObjectHook(" src/esbuild/index.ts` → 3, and none of them inside an `async (args) =>` callback (inspect)
- [ ] `grep -n "=== 'string'" src/esbuild/index.ts` → only `typeof … === 'string'` forms
- [ ] `grep -n "combineSourcemaps" src/esbuild/index.ts` → no match
- [ ] `grep -n "plugin.transform || plugin.transformInclude" src/bun/index.ts` → no match
- [ ] `pnpm typecheck`, `pnpm lint` exit 0
- [ ] `pnpm vitest run test/unit-tests/esbuild test/unit-tests/filter test/unit-tests/resolve-id` → all pass, ≥ 4 new tests
- [ ] `pnpm build && pnpm test` exits 0
- [ ] Only in-scope files modified; `plans/README.md` updated

## STOP conditions

- The excerpts don't match (e.g. `hasResult` already exists in esbuild, or `onTransform` already checks a filter before `getContents`).
- Step 3 makes an existing esbuild fixture test fail because some fixture plugin relies on `''` being ignored — report which one; do not special-case it.
- Step 5 breaks `test/unit-tests/write-bundle` or `resolve-id` for esbuild in a way that isn't the test asserting the old shared-array behaviour.
- Adding `idFilter` requires changing the `'resolveId'`/`'load'` overloads or `createCachedIdFilter` in `src/utils/webpack-like.ts` — it should not; if it does, report.

## Maintenance notes

- `createCachedIdFilter` in `src/utils/webpack-like.ts` currently obtains an id-only filter for *transform* hooks by calling `normalizeObjectHook('load', hook)` with a type cast. After this plan, `normalizeObjectHook('transform', hook).idFilter` is the honest way to get it; plan 009 should switch to it.
- Reviewers: check that `getContents()` inside the aggregated `onLoad` still caches the disk read across multiple transform plugins (the `fsContentsCache` logic) — Step 3 only changes the truthiness test, not the caching.
- `processCodeWithSourceMap` sets `sourcesContent = [code]` when missing, where `code` at the transform call site is the *transformed* code, not the original. Known inaccuracy, deferred: fixing it needs the pre-transform code threaded through; low value.
