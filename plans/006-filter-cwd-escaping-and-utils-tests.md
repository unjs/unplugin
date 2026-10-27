# Plan 006: Make relative id globs match when the cwd contains glob metacharacters, guard `mergeSourceMaps` against an empty transformed map, and give `src/utils` direct tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1ea89aa..HEAD -- src/utils/filter.ts src/utils/sourcemap.ts src/utils/webpack-like.ts test/unit-tests/utils`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (if plan 004 has landed, `normalizeObjectHook('transform')` also returns `idFilter`; that doesn't affect this plan)
- **Category**: bug / tests
- **Planned at**: commit `1ea89aa`, 2026-10-27

## Why this matters

`src/utils/filter.ts` is on the hot path of every `resolveId`/`load`/`transform` hook for eight adapters, and `src/utils/sourcemap.ts` runs in every webpack/rspack transform loader, yet neither has a direct unit test — they are only exercised indirectly through bundler integration tests with "nice" paths. Two concrete bugs hide there:

1. **Relative glob filters never match when the project path contains glob metacharacters.** `getMatcherString` does `resolve(cwd, glob)` and hands the result straight to `picomatch`. If the cwd is `/Users/me/Copy (1)/app` or `/repo/packages/[id]/…` or `/repo/apps/(group)/…`, the parentheses/brackets are interpreted as glob syntax and the matcher silently never matches, so a plugin's filtered hooks never run. `@rollup/pluginutils`' `createFilter` (which this mirrors) escapes the base path for exactly this reason.
2. **`mergeSourceMaps` passes a transformed map of `{ mappings: '' }` into `remapping`.** Rollup documents `{ mappings: '' }` as "this transform did not change mappings"; many Vite-first plugins return it. The function special-cases an *input* map with empty mappings but not a *transformed* one: a transformed map without `sources` falls through `transformedMap.sources?.length === 1` to `remapping(transformed, loader)`, whose `TraceMap` constructor dereferences `sources` and throws. A loader chain with a preceding sourcemap-producing loader then crashes.

## Current state

Files:

- `src/utils/filter.ts` — filter normalisation. `getMatcherString` (31-38), `patternToIdFilter` (40-57), `normalizeObjectHook` (160-199).
- `src/utils/sourcemap.ts` — `mergeSourceMaps(transformed, input, resource?)` (35 lines).
- `src/utils/webpack-like.ts` — `createCachedIdFilter`, `transformUse`, `normalizeAbsolutePath`; also untested directly.
- `src/utils/general.ts` — `toArray`.
- Tests: there is no `test/unit-tests/utils/` directory. Indirect coverage: `test/unit-tests/filter/filter.test.ts` (integration), `test/unit-tests/webpack/loaders/transform.test.ts:172-219` (sourcemap composition through the loader), `test/unit-tests/rspack/loaders/transform.test.ts:39-130` (lazy filter cache, calls `normalizeObjectHook` directly).

### Excerpt: `src/utils/filter.ts:12-57`

```ts
const BACKSLASH_REGEX = /\\/g
function normalize(path: string): string {
  return path.replace(BACKSLASH_REGEX, '/')
}

const ABSOLUTE_PATH_REGEX = /^(?:\/|(?:[A-Z]:)?[/\\|])/i
function isAbsolute(path: string): boolean {
  return ABSOLUTE_PATH_REGEX.test(path)
}
// ...
function getMatcherString(glob: string, cwd: string) {
  if (glob.startsWith('**') || isAbsolute(glob)) {
    return normalize(glob)
  }

  const resolved = resolve(cwd, glob)
  return normalize(resolved)
}

function patternToIdFilter(pattern: StringOrRegExp): PluginFilter {
  if (pattern instanceof RegExp) {
    return (id: string) => {
      const normalizedId = normalize(id)
      const result = pattern.test(normalizedId)
      pattern.lastIndex = 0
      return result
    }
  }
  const cwd = process.cwd()
  const glob = getMatcherString(pattern, cwd)
  const matcher = picomatch(glob, { dot: true })
  return (id: string) => {
    const normalizedId = normalize(id)
    return matcher(normalizedId)
  }
}
```

Note `getMatcherString` returns the *whole* resolved path, so the glob part and the base part are mixed; only the base (`cwd`) must be escaped — the user's glob must stay a glob.

### Excerpt: `src/utils/sourcemap.ts` (whole file)

```ts
import remapping from '@jridgewell/remapping'

/**
 * Pick the source map a loader should pass on after a transform.
 * The first loader in a chain receives no input map, so the transformed map is used as is;
 * otherwise both layers are composed instead of dropping either one.
 */
export function mergeSourceMaps(transformed: any, input: any, resource?: string): any {
  if (!transformed)
    return input
  // An empty input map has nothing to trace back to, composing it would erase the transformed mappings
  if (!input || input.mappings === '')
    return transformed

  const transformedMap = typeof transformed === 'string'
    ? JSON.parse(transformed)
    : transformed
  // remapping only accepts the array form when every outer map has a single source
  if (transformedMap.sources?.length === 1)
    return remapping([transformed, input], () => null)

  // Otherwise trace only the source that is the module being transformed and keep the others
  const file = resource?.split('?')[0].replace(/\\/g, '/')
  let traced = false
  return remapping(transformed, (source) => {
    // The input map's own sources go through this callback too, so trace only once
    if (traced)
      return null
    const normalized = source.replace(/\\/g, '/').replace(/^\.\//, '')
    if (!file || (file !== normalized && !file.endsWith(`/${normalized}`)))
      return null
    traced = true
    return input
  })
}
```

Two gaps: (a) `input` is checked for `mappings === ''` only in object form — a JSON *string* input with empty mappings is not detected; (b) `transformed` with `mappings === ''` (or no `sources`) is not handled.

### Conventions

- Tests: vitest, `describe`/`it`/`expect`. For cwd-dependent tests, the repo already uses `process.chdir(...)` inside `try { … } finally { process.chdir(originalCwd) }` — see `test/unit-tests/rspack/loaders/transform.test.ts:39-130`.
- Temp directories: use `fs.mkdtempSync(path.join(os.tmpdir(), 'unplugin-'))` and remove in `finally`/`afterEach` (pattern in `test/unit-tests/webpack/virtual-cache.test.ts`).
- The project's lint config flags unused variables and requires `node:` prefixes on built-in imports.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| New utils tests | `pnpm vitest run test/unit-tests/utils` | all pass |
| Related suites | `pnpm vitest run test/unit-tests/filter test/unit-tests/webpack/loaders test/unit-tests/rspack/loaders` | all pass |
| Full | `pnpm build && pnpm test` | exit 0 |

## Scope

**In scope**:
- `src/utils/filter.ts` — `getMatcherString` / `patternToIdFilter` only
- `src/utils/sourcemap.ts`
- `test/unit-tests/utils/filter.test.ts` (create)
- `test/unit-tests/utils/sourcemap.test.ts` (create)
- `test/unit-tests/utils/webpack-like.test.ts` (create)
- `plans/README.md`

**Out of scope**:
- `normalizeObjectHook`'s return shape (plan 004 adds `idFilter`).
- `createCachedIdFilter` behaviour (plan 009 consolidates the memoizers) — only *test* it here.
- `combineSourcemaps` in `src/esbuild/utils.ts` — different function, already tested.
- Any adapter file.

## Git workflow

- Branch: `fix/filter-glob-base-escaping`
- Commits: `fix: escape the resolved base path of relative id filters`, `fix: keep the input map when a transform returns empty mappings`, `test: cover src/utils directly`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Failing filter tests

Create `test/unit-tests/utils/filter.test.ts` that imports `normalizeObjectHook` from `../../../src/utils/filter` and:

1. Creates a temp dir whose name contains `(1) [id] {x}` (e.g. `fs.mkdtempSync(path.join(os.tmpdir(), 'unplugin (1) [id] {x}-'))`), `process.chdir`s into it, builds `normalizeObjectHook('load', { handler, filter: { id: 'src/*.js' } })`, and asserts `filter(path.join(cwd, 'src/mod.js'))` is `true` and `filter(path.join(cwd, 'src/nested/mod.js'))` is `false`.
2. Same cwd, pattern `**/mod.js` → matches `path.join(cwd, 'deep/mod.js')` (the `**` branch does not resolve against cwd; should already pass).
3. Same cwd, an absolute pattern `path.join(cwd, 'src/*.js')` → matches `path.join(cwd, 'src/mod.js')` (currently also broken because `isAbsolute(glob)` returns the raw path; decide: escaping must apply to the *directory* part of absolute patterns too, or document that absolute patterns are taken verbatim as globs — `@rollup/pluginutils` takes absolute patterns verbatim. Keep verbatim; make this test assert the verbatim behaviour with a metachar-free absolute pattern instead, and drop the metachar variant).
4. Windows-style backslash id with a forward-slash glob (`'src/mod.js'` vs id `C:\\proj\\src\\mod.js`) is **not** testable on Linux because `resolve` differs; skip it.
5. RegExp filter with the `g` flag matches the same id twice in a row (`lastIndex` reset).
6. `exclude` wins over `include`; `include: []` with no exclude matches everything (mirrors `createFilter` semantics at `filter.ts:72-87`).

Wrap in `try/finally` restoring `process.cwd()` and removing the temp dir.

**Verify**: `pnpm vitest run test/unit-tests/utils/filter.test.ts` → test 1 **fails** (`src/mod.js` under the bracketed cwd does not match); the others pass.

### Step 2: Escape the base path

In `src/utils/filter.ts`, change `getMatcherString` so the resolved cwd part is escaped before the glob is appended:

```ts
function escapeGlobBase(base: string): string {
  return base.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&')
}

function getMatcherString(glob: string, cwd: string) {
  if (glob.startsWith('**') || isAbsolute(glob))
    return normalize(glob)

  return `${escapeGlobBase(normalize(resolve(cwd)))}/${normalize(glob)}`
}
```

Picomatch treats a backslash-escaped character as literal (same approach as `@rollup/pluginutils`' `getMatcherString`). Check that `normalize(glob)` of a relative pattern beginning with `./` still works: `picomatch('…/./src/*.js')` — if it doesn't, strip a leading `./` from the glob before joining and add a test case for `./src/*.js`.

**Verify**: `pnpm vitest run test/unit-tests/utils/filter.test.ts test/unit-tests/filter` → all pass (the integration suite's `'**/mod.js'`, `'**/entry.js'` patterns still match). `pnpm typecheck` → exit 0.

### Step 3: Failing sourcemap tests

Create `test/unit-tests/utils/sourcemap.test.ts` importing `mergeSourceMaps` from `../../../src/utils/sourcemap`. Reuse the map literals from `test/unit-tests/webpack/loaders/transform.test.ts:11-35` (`originalMap`, `transformedMap`, `multiSourceMap`). Cases:

1. `transformed` falsy → returns `input`.
2. `input` falsy → returns `transformed`.
3. `input = { mappings: '' }` → returns `transformed` (existing behaviour).
4. `input = JSON.stringify({ version: 3, sources: [], names: [], mappings: '' })` (string form) → returns `transformed`. **Currently fails.**
5. `transformed = { version: 3, sources: [], names: [], mappings: '' }` with `input = originalMap` → returns `input`. **Currently throws.**
6. `transformed = JSON.stringify(transformedMap)` (string) with `input = originalMap` → composed map has `sources: ['original.ts']`, `mappings: ';AACA'` (string transformed maps are accepted).
7. Multi-source transformed map with `resource = '/project/original.ts'` → `sources: ['original.ts', 'other.ts']`, `mappings: 'AACA,CCDA'` (mirrors loader test at lines 213-219).
8. Multi-source transformed map with `resource = 'C:\\project\\original.ts?query'` → still traces `original.ts` (backslash + query normalisation).

**Verify**: `pnpm vitest run test/unit-tests/utils/sourcemap.test.ts` → cases 4 and 5 **fail**, the rest pass.

### Step 4: Harden `mergeSourceMaps`

Parse both arguments up front and check emptiness on the parsed objects:

```ts
export function mergeSourceMaps(transformed: any, input: any, resource?: string): any {
  if (!transformed)
    return input
  const inputMap = typeof input === 'string' ? JSON.parse(input) : input
  // An empty input map has nothing to trace back to, composing it would erase the transformed mappings
  if (!inputMap || inputMap.mappings === '')
    return transformed
  const transformedMap = typeof transformed === 'string' ? JSON.parse(transformed) : transformed
  // A transform that returned no mappings changed nothing the map can express, so the input map still applies
  if (transformedMap.mappings === '' || !transformedMap.sources)
    return input
  if (transformedMap.sources.length === 1)
    return remapping([transformedMap, inputMap], () => null)
  // ... rest unchanged, but pass transformedMap / inputMap (objects) to remapping
```

Keep the return-value *identity* semantics the loader tests rely on (`toBe(transformedMap)` / `toBe(map)` in `webpack/loaders/transform.test.ts`): when returning early, return the original argument (`transformed` / `input`), not the parsed copy.

**Verify**: `pnpm vitest run test/unit-tests/utils/sourcemap.test.ts test/unit-tests/webpack/loaders test/unit-tests/rspack/loaders` → all pass.

### Step 5: Direct tests for `webpack-like.ts`

Create `test/unit-tests/utils/webpack-like.test.ts` covering:

- `normalizeAbsolutePath`: relative id unchanged; absolute id normalised (`/a/./b` → `/a/b`).
- `transformUse`: returns `[]` when `data.resource` is nullish; returns `[]` when `transformInclude` rejects; returns `[]` when the filter rejects; returns one `{ loader, options: { plugin }, ident: plugin.name }` entry otherwise; appends `resourceQuery` to the id passed to the filter.
- `createCachedIdFilter`: calls `normalizeObjectHook` once for repeated calls with the same hook and cwd (spy via a getter that counts reads, as `rspack/loaders/transform.test.ts:50-60` does), and re-normalises when the hook object identity changes.

**Verify**: `pnpm vitest run test/unit-tests/utils` → all pass.

### Step 6: Lint and full run

**Verify**: `pnpm lint` → exit 0; `pnpm build && pnpm test` → exit 0.

## Test plan

Summarised in steps 1, 3, 5: ~6 filter cases, 8 sourcemap cases, ~7 webpack-like cases, all in the new `test/unit-tests/utils/` directory. Pattern files: `test/unit-tests/rspack/loaders/transform.test.ts` (cwd switching, hook getter counting), `test/unit-tests/webpack/loaders/transform.test.ts` (map literals).

## Done criteria

- [ ] `ls test/unit-tests/utils/` → `filter.test.ts sourcemap.test.ts webpack-like.test.ts`
- [ ] `grep -n "escapeGlobBase\|\\\\\\$&" src/utils/filter.ts` → match (an escaping function exists)
- [ ] `grep -n "transformedMap.mappings === ''" src/utils/sourcemap.ts` → match
- [ ] `pnpm typecheck`, `pnpm lint` exit 0
- [ ] `pnpm vitest run test/unit-tests/utils test/unit-tests/filter test/unit-tests/webpack/loaders test/unit-tests/rspack/loaders` → all pass
- [ ] `pnpm build && pnpm test` exits 0
- [ ] Only in-scope files modified; `plans/README.md` updated

## STOP conditions

- The excerpts don't match the live code.
- After Step 2 the integration suite `test/unit-tests/filter` fails for *any* bundler — escaping changed matching for ordinary paths; report the failing pattern rather than adjusting the suite.
- Picomatch does not honour backslash escapes for `(`/`[` in your test (i.e. test 1 still fails after Step 2) — report; an alternative is passing the glob and base separately via picomatch's `{ cwd }`-free approach (`matcher(relative(cwd, id))`), but don't switch approaches without reporting first.
- Step 4 changes the identity semantics the loader tests assert (`toBe`) and you cannot preserve them.

## Maintenance notes

- Absolute string patterns are intentionally taken verbatim (as in `@rollup/pluginutils`); document that in the filter section of `docs/guide/index.md` when plan 010 touches docs: "relative globs are resolved against `process.cwd()` at plugin-creation time; absolute globs are used as-is".
- Reviewers: `mergeSourceMaps` is typed `any` on purpose for now; tightening to `SourceMapInput | string` is a reasonable follow-up once both loaders are typed (plan 009).
