# Plan 005: Make the Farm adapter honour the shared hook contract (`load` → null, `transform` → string, `resolveId` importer/isEntry/sideEffects)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1ea89aa..HEAD -- src/farm/index.ts src/farm/utils.ts test/unit-tests/farm/index.test.ts test/unit-tests/farm/utils.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (steps 1-4), MED (step 5, `sideEffects`)
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `1ea89aa`, 2026-10-27

## Why this matters

unplugin's promise is that one plugin definition behaves the same on every bundler. The contract (from `src/types.ts:98-105`) is: `load`/`transform` return `string | { code, map? } | null | undefined`, and `resolveId(id, importer: string | undefined, { isEntry })`. The Farm adapter breaks it in four places:

1. `load` returning `null`/`undefined` ("not my module", the normal case) **throws** `Content cannot be null or undefined` and fails the build. The only reason the fixture passes is that it uses `loadInclude` to keep the hook from ever seeing other modules.
2. `transform` returning a plain string (the most common Rollup form) is **silently dropped** — the executor falls off the end and returns `undefined`, so the original code is kept.
3. `resolveId` receives `importer = process.cwd()` for entry modules (because of `path.resolve(params.importer ?? '')`), where every other adapter passes `undefined` — the cross-bundler test `test/unit-tests/resolve-id/resolve-id.test.ts:39-43` asserts `undefined` for entries. `isEntry` is `true` only when the entry's *name* is `'index'`, which is a coincidence of the fixture config.
4. A `{ id }` result from `resolveId` is marked `sideEffects: false` while a string result is `sideEffects: true`. Nothing in the unplugin API expresses side effects; the asymmetry can let Farm tree-shake away side-effect-only imports resolved via the object form.

## Current state

Files:

- `src/farm/index.ts` — `toFarmPlugin(plugin, options)` builds a Farm `JsPlugin`; `resolve` at lines 88-147, `load` at 149-183, `transform` at 185-226.
- `src/farm/utils.ts:147-157` — `getContentValue(content)` throws on null/undefined.
- `src/farm/context.ts` — `createFarmContext(context, currentResolveId?)`; `currentResolveId` is only used as the second argument to `context.addWatchFile(id, currentResolveId || id)`.
- `test/unit-tests/farm/index.test.ts` — mock-executor unit tests (`toFarmPlugin(plugin).load?.executor(params, context)` style). Uses `{} as any` for the Farm `CompilationContext`.
- `test/fixtures/{load,transform,virtual-module}/farm.config.js` — real Farm builds run by `scripts/buildFixtures.ts`; asserted by `test/fixtures/*/__test__/build.test.ts`.

### Excerpt: `src/farm/index.ts:101-147` (resolve)

```ts
      async executor(params: PluginResolveHookParam, context: CompilationContext) {
        const resolvedIdPath = path.resolve(
          params.importer ?? '',
        )
        const id = decodeStr(params.source)

        const { handler, filter } = normalizeObjectHook('resolveId', _resolveId)
        if (!filter(id))
          return null

        let isEntry = false
        if (isObject(params.kind) && 'entry' in params.kind) {
          const kindWithEntry = params.kind as { entry: string }
          isEntry = kindWithEntry.entry === 'index'
        }
        const farmContext = createFarmContext(context!, resolvedIdPath)
        const resolveIdResult = await handler.call(
          Object.assign(unpluginContext(context), farmContext),
          id,
          resolvedIdPath ?? null,
          { isEntry },
        )

        if (isString(resolveIdResult)) {
          return {
            resolvedPath: removeQuery(encodeStr(resolveIdResult)),
            query: customParseQueryString(resolveIdResult),
            sideEffects: true,
            external: false,
            meta: {},
          }
        }
        if (isObject(resolveIdResult)) {
          return {
            resolvedPath: removeQuery(encodeStr(resolveIdResult?.id)),
            query: customParseQueryString(resolveIdResult?.id),
            sideEffects: false,
            external: Boolean(resolveIdResult?.external),
            meta: {},
          }
        }

        if (!isStartsWithSlash(params.source))
          return null
      },
```

### Excerpt: `src/farm/index.ts:165-181` (load)

```ts
        const { handler, filter } = normalizeObjectHook('load', _load)
        if (!filter(id))
          return null

        const farmContext = createFarmContext(context!, id)
        const content: TransformResult = await handler.call(
          Object.assign(unpluginContext(context!), farmContext),
          id,
        )

        const loadFarmResult: PluginLoadHookResult = {
          content: getContentValue(content),
          moduleType: loader,
        }

        return loadFarmResult
```

### Excerpt: `src/farm/index.ts:207-224` (transform)

```ts
        const farmContext = createFarmContext(context, id)
        const resource: TransformResult = await handler.call(
          Object.assign(unpluginContext(context), farmContext),
          params.content,
          id,
        )
        if (resource && typeof resource !== 'string') {
          const transformFarmResult: PluginTransformHookResult = {
            content: getContentValue(resource),
            moduleType: loader,
            sourceMap: typeof resource.map === 'object' && resource.map !== null
              ? JSON.stringify(resource.map)
              : undefined,
          }

          return transformFarmResult
        }
      },
```

### Excerpt: `src/farm/utils.ts:147-157`

```ts
export function getContentValue(content: any): string {
  if (content === null || content === undefined) {
    throw new Error('Content cannot be null or undefined')
  }

  const strContent = typeof content === 'string'
    ? content
    : (content.code || '')

  return encodeStr(strContent)
}
```

### Excerpt: existing test style, `test/unit-tests/farm/index.test.ts:78-100`

```ts
  it('should handle load hook', async () => {
    const loadMock = vi.fn(() => ({ code: 'test-content' }))
    const plugin: UnpluginOptions = { name: 'test-plugin', load: loadMock }
    const farmPlugin = toFarmPlugin(plugin)
    const result = await farmPlugin.load?.executor(
      { resolvedPath: 'test-path', query: [['', '']] } as any,
      {} as any,
    )
    expect(loadMock).toHaveBeenCalled()
    expect(result).toHaveProperty('content', 'test-content')
  })
```

And `:192-216` asserts `isEntry: true` for `kind: { entry: 'index' }` with `importer: 'test-importer'` — keep that test passing (it will, since `'entry' in kind` is still true).

### Conventions

- Farm's own contract: a hook executor returning `null` means "skip, let the next plugin/Farm handle it" — used already at `index.ts:109,163,168,200,205`.
- Keep the `JsPlugin[...]` casts as they are; typing the executors properly is out of scope.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Farm unit tests | `pnpm vitest run test/unit-tests/farm` | all pass |
| Farm fixture builds | `pnpm test:build` (or `pnpm test:build load farm` after plan 001) | exit 0 |
| Fixture assertions | `pnpm vitest run test/fixtures` | all pass |
| Full | `pnpm build && pnpm test` | exit 0 |

## Scope

**In scope**:
- `src/farm/index.ts` — `resolve`, `load`, `transform` executors only
- `test/unit-tests/farm/index.test.ts`
- `plans/README.md`

**Out of scope**:
- `src/farm/utils.ts` — leave `getContentValue` throwing; the callers stop passing null. (Plan 008 removes dead exports from this file; don't do that here.)
- `src/farm/context.ts`.
- Adding Farm to the cross-bundler integration suites (`test/unit-tests/{filter,resolve-id,…}`) — valuable but a separate effort (noted in plan 007's maintenance notes).
- Any other adapter.

## Git workflow

- Branch: `fix/farm-hook-contract`
- Commits: `fix(farm): skip the module when load returns null`, `fix(farm): accept string results from transform`, `fix(farm): pass undefined importer and real isEntry to resolveId`, `fix(farm): keep sideEffects for object resolveId results`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Failing tests for `load` → null and `transform` → string

In `test/unit-tests/farm/index.test.ts` add:

- `'load returning null skips the module'`: `load: vi.fn(() => null)`; `await executor(...)` resolves to `null` (does not throw).
- `'load returning undefined skips the module'`: same with `() => undefined`.
- `'transform returning a string replaces the content'`: `transform: vi.fn(() => 'transformed-content')`; result has `content: 'transformed-content'` and `sourceMap: undefined`.
- `'transform returning null keeps the original content'`: `transform: vi.fn(() => null)`; result is `null`.

**Verify**: `pnpm vitest run test/unit-tests/farm` → the four new tests **fail** (throw / `undefined` content / `undefined` instead of `null`).

### Step 2: Fix `load`

In the `load` executor, after `const content = await handler.call(...)`:

```ts
        if (content == null)
          return null
```

before building `loadFarmResult`.

**Verify**: `pnpm vitest run test/unit-tests/farm` → the two load tests pass.

### Step 3: Fix `transform`

Replace the `if (resource && typeof resource !== 'string') { … }` block with:

```ts
        if (resource == null)
          return null

        return {
          content: getContentValue(resource),
          moduleType: loader,
          sourceMap: typeof resource === 'object' && typeof resource.map === 'object' && resource.map !== null
            ? JSON.stringify(resource.map)
            : undefined,
        } satisfies PluginTransformHookResult
```

(`getContentValue` already handles both the string and `{ code }` shapes.) Keep the `PluginTransformHookResult` import in use; if `satisfies` conflicts with the file's style, keep the typed `const` form the file uses today.

**Verify**: `pnpm vitest run test/unit-tests/farm` → all pass.

### Step 4: Fix `resolveId` importer and `isEntry`

In the `resolve` executor:

```ts
        const importer = params.importer
          ? path.resolve(params.importer)
          : undefined
        const id = decodeStr(params.source)
        // ...
        const isEntry = isObject(params.kind) && 'entry' in params.kind
        const farmContext = createFarmContext(context!, importer)
        const resolveIdResult = await handler.call(
          Object.assign(unpluginContext(context), farmContext),
          id,
          importer,
          { isEntry },
        )
```

Add tests:
- `'resolveId receives undefined importer for entries'`: `executor({ source: 'test-source', importer: null, kind: { entry: 'main' } })` → handler called with `(…, undefined, { isEntry: true })`.
- `'resolveId receives the importer path for imports'`: `importer: '/abs/importer.js', kind: 'import'` → second arg is `'/abs/importer.js'`, `isEntry: false`.

The existing `isEntry` test (`kind: { entry: 'index' }`) still passes. Check `@farmfe/core`'s `PluginResolveHookParam` type for `importer`'s nullability (`string | null`) and `kind`'s shape so the new tests' `as any` casts are honest.

**Verify**: `pnpm vitest run test/unit-tests/farm` → all pass; `pnpm typecheck` → exit 0.

### Step 5: `sideEffects: true` for object results

Change `sideEffects: false` to `sideEffects: true` in the `isObject(resolveIdResult)` branch so both result shapes are treated identically. Add a test asserting both a string result and `{ id }` result produce `sideEffects: true`.

**Verify**: `pnpm vitest run test/unit-tests/farm` → all pass.

### Step 6: Fixture builds still pass

**Verify**: `pnpm build && pnpm test:build && pnpm vitest run test/fixtures` → all pass (the three Farm fixture outputs still contain their expected tokens). Then `pnpm lint` → exit 0.

## Test plan

New tests in `test/unit-tests/farm/index.test.ts`: load→null, load→undefined, transform→string, transform→null, resolveId importer undefined for entry, resolveId importer passed for import, sideEffects parity (≈7 tests). Pattern: the existing `should handle load hook` / `should handle isEntry in resolveId hook` tests in the same file.

## Done criteria

- [ ] `grep -n "resource && typeof resource !== 'string'" src/farm/index.ts` → no match
- [ ] `grep -n "sideEffects: false" src/farm/index.ts` → no match
- [ ] `grep -n "params.importer ?? ''" src/farm/index.ts` → no match
- [ ] `grep -n "entry === 'index'" src/farm/index.ts` → no match
- [ ] `pnpm typecheck`, `pnpm lint` exit 0
- [ ] `pnpm vitest run test/unit-tests/farm` → all pass, ≥ 7 new tests
- [ ] `pnpm build && pnpm test` exits 0
- [ ] Only in-scope files modified; `plans/README.md` updated

## STOP conditions

- The excerpts don't match the live code.
- Any Farm fixture build (`pnpm test:build`) fails after Step 5 — the `sideEffects` change interacts with Farm's tree-shaking in a way the fixture catches; revert Step 5 only, mark it deferred in the report, and keep Steps 1-4.
- `@farmfe/core` types say `params.importer` is always a string (never null) — then Step 4's `undefined` branch needs a different entry signal; report what the type says.

## Maintenance notes

- Farm is the only adapter with no real-bundler coverage in the cross-bundler suites (`test/unit-tests/{filter,resolve-id,resolve-id-external,id-consistency,virtual-id,write-bundle}`). Adding `it('farm', …)` cases via `@farmfe/core`'s programmatic `build()` would have caught all four bugs here; it is deferred because it needs a Farm build harness in `test/unit-tests/utils.ts`.
- Reviewers: Step 5 is a behaviour change for Farm users relying (probably unknowingly) on `{ id }` results being tree-shakeable. It aligns Farm with Rollup, where side effects are determined by the module, not the resolve shape.
