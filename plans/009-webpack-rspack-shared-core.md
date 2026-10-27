# Plan 009: Share the webpack/rspack hook-invocation core through `src/utils/webpack-like.ts` so fixes land on both adapters at once

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1ea89aa..HEAD -- src/utils/webpack-like.ts src/webpack/index.ts src/webpack/context.ts src/webpack/loaders src/rspack/index.ts src/rspack/context.ts src/rspack/loaders test/unit-tests/webpack test/unit-tests/rspack test/unit-tests/utils`
> **Expected drift**: plans 002, 003 and 008 touch these files and should have landed first — read the current code, not the excerpts below, for the regions those plans changed (rspack `raw`, rspack `buildEnd` on `processAssets`, webpack `try/catch` in the resolver tap, removed `__unpluginMeta`/`__vfsModules`). Anything *else* that differs is a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/001-test-harness.md, plans/002-rspack-loader-parity.md, plans/003-webpack-resolveid-errors-and-emitfile-bytes.md, plans/008-dead-code-removal.md
- **Category**: tech-debt
- **Planned at**: commit `1ea89aa`, 2026-10-27

## Why this matters

`src/webpack/` and `src/rspack/` are ~1050 lines of which roughly 220 are near-identical copies: the `resolveId` tap body (71 vs 59 lines, 26 differing), the `watchChange`/`buildStart`/`writeBundle` wiring (2 differing lines in ~27), `normalizeMessage` + `createContext` (byte-identical), the four loader files (~60 of 83 and ~37 of 56 lines shared), and *five* separate implementations of "memoise the normalised hook filter by hook identity and cwd". In the last 200 commits touching `src/`, 72 touched webpack only and 19 rspack only; at least two recent fixes (#619 `buildEnd` stage, #623 raw loaders) shipped on one side and had to be re-discovered for the other (plan 002). The fix is not a grand abstraction — the two bundlers differ in real ways (resolver plugin vs `normalModuleFactory.hooks.resolve`; virtual-module strategy; `Compilation` types) — but the *hook invocation bodies* are the same and belong in one place. `src/utils/webpack-like.ts` already exists for exactly this and holds three functions.

Scope discipline: this plan shares **bodies** (pure functions and small async helpers) and leaves each adapter's **taps** (which compiler hook, which types) in place. That keeps type gymnastics out and makes the diff reviewable.

## Current state

Files (line numbers are as of `1ea89aa`; re-read after the dependent plans):

- `src/utils/webpack-like.ts` — `createCachedIdFilter`, `transformUse`, `normalizeAbsolutePath`.
- `src/webpack/context.ts:67-83`, `src/rspack/context.ts:45-61` — identical `createContext(loader)` and `normalizeMessage(error)`.
- `src/webpack/index.ts:103-186` and `src/rspack/index.ts:106-161` — resolveId tap: `cachedResolveId` memo, `pluginContext` with `error`/`warn` (console prefix `unplugin/webpack:` vs `unplugin/rspack:`), `handler.call({...context, ...pluginContext}, id, importer, { isEntry })`, then unpack `resolved`/`isExternal`.
- `src/webpack/index.ts:273-294`, `src/rspack/index.ts:264-285` — `make` tap body for `watchChange` + `buildStart`.
- `src/webpack/index.ts:315-319`, `src/rspack/index.ts:293-297` — `afterEmit` tap for `writeBundle`.
- `src/webpack/index.ts:326-339` `shouldLoad` (exported) vs `src/rspack/index.ts:223-236` inline `include(id)` — same logic, different virtual-id decoding.
- `src/webpack/loaders/transform.ts:9-12,27-41` and `src/rspack/loaders/transform.ts:8-11,26-40` — module-level `filters` WeakMap memo keyed by hook with a cwd check.
- All four loader files end with the same `catch (error) { callback(error instanceof Error ? error : new Error(String(error))) }` shape.
- Tests: `test/unit-tests/webpack/context.test.ts` imports `createContext, normalizeMessage` from `src/webpack/context`; `test/unit-tests/rspack/context.test.ts` imports `createContext` from `src/rspack/context`; `test/unit-tests/rspack/loaders/transform.test.ts:39-130` tests the filter memo ("caches lazy filters per hook and cwd while reading handlers fresh") for **both** adapters through `getRspackPlugin`/`getWebpackPlugin`; `test/unit-tests/utils/webpack-like.test.ts` exists if plan 006 landed.

### Excerpt: the memo pattern (webpack resolveId, `src/webpack/index.ts:172-185`)

```ts
                    const hook = plugin.resolveId!
                    const cwd = process.cwd()
                    let handler: HookFnMap['resolveId']
                    if (cachedResolveId?.hook === hook && cachedResolveId.cwd === cwd) {
                      handler = typeof hook === 'function'
                        ? hook
                        : hook.handler
                    }
                    else {
                      const normalized = normalizeObjectHook('resolveId', hook)
                      handler = normalized.handler
                      cachedResolveId = { hook, cwd, filter: normalized.filter }
                    }
                    const { filter } = cachedResolveId
```

Semantics the memo must preserve (asserted by the lazy-filter test): the **filter** is computed once per `(hook object, cwd)`; the **handler** is re-read from the hook object on every call (`hook.handler` may be a getter). `createCachedIdFilter` (`webpack-like.ts:7-16`) is the same idea taking a `getHook` thunk, and it abuses `normalizeObjectHook('load', hook)` to get an id-only filter for transform hooks (after plan 004, `normalizeObjectHook('transform', hook).idFilter` is the honest form).

### Excerpt: `make` tap body (`src/rspack/index.ts:264-285`)

```ts
    if (plugin.watchChange || plugin.buildStart) {
      compiler.hooks.make.tapPromise(plugin.name, async (compilation) => {
        const context = createBuildContext(compiler, compilation)
        if (plugin.watchChange && (compiler.modifiedFiles || compiler.removedFiles)) {
          const promises: Promise<void>[] = []
          if (compiler.modifiedFiles) {
            compiler.modifiedFiles.forEach(file =>
              promises.push(Promise.resolve(plugin.watchChange!.call(context, file, { event: 'update' }))),
            )
          }
          if (compiler.removedFiles) {
            compiler.removedFiles.forEach(file =>
              promises.push(Promise.resolve(plugin.watchChange!.call(context, file, { event: 'delete' }))),
            )
          }
          await Promise.all(promises)
        }

        if (plugin.buildStart)
          return await plugin.buildStart.call(context)
      })
    }
```

Webpack's version differs only in `createBuildContext(contextOptionsFromCompilation(compilation), compiler, compilation)`.

### Conventions

- `src/utils/webpack-like.ts` is the designated shared module for the webpack-family adapters; it imports types from `@rspack/core` already (`RuleSetUseItem`), so importing structural types from either bundler is accepted there.
- Loaders are separate tsdown entries (`tsdown.config.ts` `entry: ['src/index.ts', 'src/{webpack,rspack}/loaders/*']`); shared code imported by loaders must not rely on module-level state being shared with `src/index.ts` (a WeakMap memo per chunk is fine — it's just a cache).
- Keep the console message prefixes adapter-specific (`unplugin/webpack:` / `unplugin/rspack:`); pass the adapter name in.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Install + build | `pnpm install && pnpm build` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Adapter suites | `pnpm build && pnpm vitest run test/unit-tests/webpack test/unit-tests/rspack test/unit-tests/utils test/unit-tests/virtual-id test/unit-tests/resolve-id test/unit-tests/resolve-id-external test/unit-tests/filter test/unit-tests/id-consistency test/unit-tests/build-end test/unit-tests/write-bundle` | all pass |
| Full | `pnpm test` | exit 0 |

**Rebuild after every change to `src/{webpack,rspack}/**` or `src/utils/webpack-like.ts`** — integration tests execute the loaders from `dist/`.

## Scope

**In scope**:
- `src/utils/webpack-like.ts`
- `src/webpack/index.ts`, `src/webpack/context.ts`, `src/webpack/loaders/{load,transform}.ts`
- `src/rspack/index.ts`, `src/rspack/context.ts`, `src/rspack/loaders/{load,transform}.ts`
- `test/unit-tests/webpack/context.test.ts`, `test/unit-tests/rspack/context.test.ts` (import paths), `test/unit-tests/utils/webpack-like.test.ts` (new cases)
- `plans/README.md`

**Out of scope**:
- Changing *which* compiler hooks are tapped, the virtual-module strategy of either adapter (`_virtual_` prefix + `webpack-virtual-modules` vs `node_modules/.virtual` + native/fake plugin), or `FakeVirtualModulesPlugin`.
- `src/rsbuild/index.ts` (consumes `getRspackPluginFromRaw`; signature must not change).
- Public subpath exports in `package.json` (`./webpack/loaders/load` etc.) — loader file paths stay.
- Anything in `src/esbuild`, `src/bun`, `src/farm`, `src/rollup`.
- Behaviour changes of any kind. If you find a divergence between the two adapters that looks like a bug (beyond the ones plans 002/003 fixed), preserve each adapter's current behaviour and list the divergence in your report.

## Git workflow

- Branch: `refactor/webpack-rspack-shared-core`
- One commit per step: `refactor: share normalizeMessage and the loader context between webpack and rspack`, `refactor: memoize normalized hooks in one place`, `refactor: share the resolveId invocation between webpack and rspack`, `refactor: share watchChange and writeBundle bodies`, `refactor: share the load rule predicate`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Move `normalizeMessage` and `createContext` to `webpack-like.ts`

- Add to `src/utils/webpack-like.ts`:
  ```ts
  export function normalizeMessage(error: string | UnpluginMessage): Error { /* body from webpack/context.ts:75-83 */ }

  export function createLoaderContext(loader: { emitError: (error: Error) => void, emitWarning: (warning: Error) => void }): UnpluginContext {
    return {
      error: error => loader.emitError(normalizeMessage(error)),
      warn: message => loader.emitWarning(normalizeMessage(message)),
    }
  }
  ```
  (Both bundlers' `LoaderContext` satisfy that structural parameter type.)
- In `src/webpack/context.ts` and `src/rspack/context.ts`, delete the two functions and re-export for compatibility **only if** a test imports them from there; simpler: update `test/unit-tests/webpack/context.test.ts` and `test/unit-tests/rspack/context.test.ts` to import `normalizeMessage`/`createLoaderContext` from `src/utils/webpack-like` and delete the re-exports. Update all `src/` import sites (`webpack/index.ts`, `rspack/index.ts`, four loaders).

**Verify**: `grep -rn "function normalizeMessage\|function createContext" src/webpack src/rspack` → nothing. `pnpm typecheck` → exit 0. `pnpm vitest run test/unit-tests/webpack test/unit-tests/rspack` → all pass.

### Step 2: One hook memo

Add to `src/utils/webpack-like.ts`:

```ts
const normalizedHooks = new WeakMap<object, { cwd: string, normalized: ReturnType<typeof normalizeObjectHook> }>()

/** Normalize once per (hook object, cwd); the handler is always read fresh so getters stay live. */
export function getNormalizedHook<N extends 'resolveId' | 'load' | 'transform'>(name: N, hook: Hook<HookFnMap[N], ...>) {
  if (typeof hook === 'function')
    return normalizeObjectHook(name, hook)
  const cwd = process.cwd()
  let cached = normalizedHooks.get(hook)
  if (!cached || cached.cwd !== cwd) {
    cached = { cwd, normalized: normalizeObjectHook(name, hook) }
    normalizedHooks.set(hook, cached)
  }
  return { ...cached.normalized, handler: hook.handler }
}
```

Write the overloads so the return type matches `normalizeObjectHook`'s per-name overloads (copy its three overload signatures). Then:

- Replace `cachedResolveId` (+ its `let` declaration and the `PluginFilter`/`HookFnMap` imports if unused) in both `index.ts` files with `const { handler, filter } = getNormalizedHook('resolveId', plugin.resolveId!)`.
- Replace the `filters` WeakMap blocks in both transform loaders with `const { handler, filter } = getNormalizedHook('transform', hook)`.
- Reimplement `createCachedIdFilter(getHook)` as `(id) => getNormalizedHook('transform', getHook()).idFilter(id)` for the transform rule, and `getNormalizedHook('load', getHook()).filter(id)` for the load rule — i.e. split into `createCachedLoadFilter` / `createCachedTransformIdFilter` or give it a `name` parameter; drop the `LoadHookFilter` cast hack. (If plan 004 has not landed and `idFilter` doesn't exist, STOP — the dependency order says it should have.)

**Verify**: `pnpm vitest run test/unit-tests/rspack/loaders/transform.test.ts` → the lazy-filter test still passes for both adapters (filter read once per cwd, handler read fresh). `grep -rn "cachedResolveId\|new WeakMap" src/webpack src/rspack` → nothing. `pnpm typecheck` → exit 0.

### Step 3: Share the `resolveId` invocation body

Add to `webpack-like.ts`:

```ts
export interface ResolvedId { id: string, external: boolean }

export async function callResolveIdHook(
  adapter: 'webpack' | 'rspack',
  plugin: ResolvedUnpluginOptions,
  buildContext: UnpluginBuildContext,
  id: string,
  importer: string | undefined,
  isEntry: boolean,
): Promise<ResolvedId | null> {
  const { handler, filter } = getNormalizedHook('resolveId', plugin.resolveId!)
  if (!filter(id))
    return null
  let error: Error | undefined
  const pluginContext: UnpluginContext = {
    error(msg) {
      if (error == null) error = normalizeMessage(msg)
      else console.error(`unplugin/${adapter}: multiple errors returned from resolveId hook: ${msg}`)
    },
    warn(msg) { console.warn(`unplugin/${adapter}: warning from resolveId hook: ${msg}`) },
  }
  const result = await handler.call({ ...buildContext, ...pluginContext }, id, importer, { isEntry })
  if (error != null) throw error
  if (result == null) return null
  return typeof result === 'string'
    ? { id: result, external: false }
    : { id: result.id, external: result.external === true }
}
```

Then in each `index.ts`, the tap keeps: request guards, `id`/`importer`/`isEntry` derivation (including the virtual-prefix importer decoding), building `context` via its own `createBuildContext`, then `const resolved = await callResolveIdHook('webpack', plugin, context, id, importer, isEntry)`; `if (!resolved) return callback()` (webpack) / `return` (rspack); `if (resolved.external) externalModules.add(resolved.id)`; then the adapter's own virtual-module handling and redirect. Webpack's `try/catch` from plan 003 wraps the whole thing; rspack's `tapPromise` propagates the throw.

**Verify**: `pnpm build && pnpm vitest run test/unit-tests/resolve-id test/unit-tests/resolve-id-external test/unit-tests/virtual-id test/unit-tests/webpack/virtual-cache.test.ts` → all pass (including plan 003's "resolveId throws" cases and the `this.error` path if a test covers it; if none does, add one in `test/unit-tests/utils/webpack-like.test.ts` calling `callResolveIdHook` with a hook that calls `this.error('boom')` and asserting it rejects with `boom`).

### Step 4: Share the `watchChange`/`buildStart` and `writeBundle` bodies

Add to `webpack-like.ts`:

```ts
export async function runMakeHooks(
  plugin: ResolvedUnpluginOptions,
  context: UnpluginBuildContext,
  modifiedFiles: ReadonlySet<string> | undefined,
  removedFiles: ReadonlySet<string> | undefined,
): Promise<void> { /* body of the make tap after `const context = …` */ }
```

Each adapter's `make` tap becomes three lines: create its context, `await runMakeHooks(plugin, context, compiler.modifiedFiles, compiler.removedFiles)`. `writeBundle` taps are already 3 lines each — leave them (not worth a helper).

**Verify**: `pnpm build && pnpm vitest run test/unit-tests/framework-version test/unit-tests/watch-change test/unit-tests/write-bundle` (watch-change exists if plan 007 landed) → all pass.

### Step 5: Share the load-rule predicate

Replace webpack's exported `shouldLoad` and rspack's inline `include(id)` with one helper:

```ts
export function shouldLoad(
  id: string,
  plugin: ResolvedUnpluginOptions,
  externalModules: Set<string>,
  filter: PluginFilter,
  decodeVirtualId: (id: string) => string,
): boolean {
  id = decodeVirtualId(id)
  if (plugin.loadInclude && !plugin.loadInclude(id)) return false
  if (!filter(id)) return false
  return !externalModules.has(id)
}
```

Webpack passes `id => id.startsWith(plugin.__virtualModulePrefix) ? decodeURIComponent(id.slice(plugin.__virtualModulePrefix.length)) : id`; rspack passes `id => isVirtualModuleId(id, plugin) ? decodeVirtualModuleId(id, plugin) : id`. Check `grep -rn "shouldLoad" test` first — if a test imports it from `src/webpack`, update the import.

**Verify**: `pnpm build && pnpm vitest run test/unit-tests/filter test/unit-tests/id-consistency test/unit-tests/resolve-id-external` → all pass.

### Step 6: Loader catch blocks

Add `export function toLoaderError(error: unknown): Error { return error instanceof Error ? error : new Error(String(error)) }` to `webpack-like.ts` and use it in all four loaders' `catch`. (Full loader-body extraction is deliberately **not** done — see Maintenance notes.)

**Verify**: `pnpm vitest run test/unit-tests/webpack/loaders test/unit-tests/rspack/loaders` → all pass.

### Step 7: Measure, lint, full run

**Verify**: `git diff --stat 1ea89aa..HEAD -- src/webpack src/rspack src/utils/webpack-like.ts` shows a net reduction of at least 100 lines across those paths (the exact figure depends on plans 002/003/008). `pnpm lint` → exit 0. `pnpm test` → exit 0.

## Test plan

- Existing suites are the regression net; they must pass unchanged except for import paths.
- New in `test/unit-tests/utils/webpack-like.test.ts`: `getNormalizedHook` reuses the filter for the same hook+cwd and re-reads `handler` (port the lazy-filter test's core assertion); `callResolveIdHook` returns `null` when the filter rejects, returns `{ id, external }` for both result shapes, rejects when the hook calls `this.error`; `shouldLoad` decodes via the supplied function and honours `loadInclude`/`externalModules`; `runMakeHooks` calls `watchChange` with `'update'` for modified and `'delete'` for removed files and then `buildStart`.

## Done criteria

- [ ] `grep -rn "cachedResolveId\|new WeakMap\|function normalizeMessage\|function createContext\|multiple errors returned from resolveId" src/webpack src/rspack` → nothing
- [ ] `grep -c "export function" src/utils/webpack-like.ts` → ≥ 8
- [ ] `pnpm typecheck`, `pnpm lint` exit 0
- [ ] `pnpm build && pnpm test` exits 0
- [ ] `git diff --stat` for `src/webpack src/rspack src/utils/webpack-like.ts` is net negative by ≥ 100 lines
- [ ] Only in-scope files modified; `plans/README.md` updated

## STOP conditions

- The dependent plans (002, 003, 008) have not landed — their changes are assumed in the excerpts' "expected drift".
- `normalizeObjectHook('transform', …)` has no `idFilter` (plan 004 not landed).
- Sharing a body requires changing an adapter's observable behaviour (a test that passed only for one adapter now fails for the other) — stop and report the divergence; don't pick a winner silently.
- A union-typed call on `compiler.hooks.*` is needed to share a *tap* — don't; this plan shares bodies only.
- `pnpm build` output for the loader entries grows substantially (check `ls -la dist/webpack/loaders dist/rspack/loaders` before/after) — would indicate tsdown inlining the whole shared module into each loader; report sizes.

## Maintenance notes

- Future webpack/rspack fixes should start in `src/utils/webpack-like.ts`; a fix that touches only one `index.ts` or one loader pair is a review smell.
- Deferred: a shared `runLoader(kind, …)` body for the four loader files. The remaining per-adapter differences (context construction signature, `this.sourceMap === false` map passthrough, virtual-id decoding) make a shared body about as long as the two it replaces; revisit if the loaders diverge again.
- Deferred: dropping the `cwd` key from the memo for `resolveId` (its filter is RegExp-only, so cwd cannot matter). Kept uniform here for simplicity.
