# Plan 001: Make the test suite runnable cold and make webpack/rspack integration tests fail on compilation errors

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1ea89aa..HEAD -- package.json scripts/buildFixtures.ts test/unit-tests/utils.ts test/unit-tests/webpack/loaders/transform.test.ts test/unit-tests/rspack/loaders/transform.test.ts test/unit-tests/filter/filter.test.ts test/unit-tests/resolve-id/resolve-id.test.ts test/unit-tests/resolve-id-external/resolve-id-external.test.ts test/unit-tests/id-consistency/id-consistency.test.ts test/unit-tests/virtual-id/virtual-id.test.ts test/unit-tests/write-bundle/write-bundle.test.ts test/unit-tests/framework-version/index.test.ts test/unit-tests/build-end/build-end.test.ts test/unit-tests/webpack/virtual-cache.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests / dx
- **Planned at**: commit `1ea89aa`, 2026-10-27

## Why this matters

`unplugin` adapts one plugin definition to ten bundlers, and the only thing that keeps the adapters in sync is the test suite. Today that suite has three holes: (1) on a fresh clone `pnpm test` fails with confusing errors because the webpack/rspack adapters load their loader files from `dist/` and nothing says "build first"; (2) the fixture builder runs 21 bundler invocations serially and its `dist` cleanup silently no-ops, so stale output can satisfy assertions; (3) most webpack/rspack integration tests resolve their promise regardless of `stats.hasErrors()`, so a build that *errors* still passes as long as the hook mocks were called. A fourth, smaller hole: the loader "filter does not match" tests pass by accident because they give `normalizeObjectHook` a `vi.fn()` where it expects a `{ id, code }` object, which normalises to "match everything".

Several later plans (002, 003, 007, 009) add tests that must *fail* when a build errors; they need the shared helper this plan introduces.

## Current state

Files and their roles:

- `package.json` — scripts. `"test": "nr test:build && vitest run"`, `"test:build": "node scripts/buildFixtures.ts"`, `"build": "tsdown"`. `nr` is `@antfu/ni`'s run command (installed as a devDependency).
- `scripts/buildFixtures.ts` — builds `test/fixtures/{load,transform,virtual-module}` with 7 bundlers each via `execSync`.
- `src/webpack/index.ts:14-28` and `src/rspack/index.ts:21-35` — loader path constants. In dev (`import.meta.dev === true`, set in `vitest.config.ts:6`) they resolve to `../../dist/<bundler>/loaders/*.mjs`. **So every webpack/rspack integration test requires a prior `pnpm build`, and changes to `src/*/loaders/*.ts` are only picked up by integration tests after a rebuild.** Loader *unit* tests (`test/unit-tests/{webpack,rspack}/loaders/*.test.ts`) import the loader source directly and do not need a build.
- `test/unit-tests/utils.ts` — exports `build.{webpack,rspack,rsbuild,rollup,rolldown,vite,esbuild,bun}` wrappers.
- `test/unit-tests/webpack/virtual-cache.test.ts:37-60` — the one place that already does webpack error handling right.
- `test/fixtures/*/__test__/build.test.ts` — read `test/fixtures/<name>/dist/<bundler>/...` produced by `buildFixtures.ts`.

### Excerpt: `scripts/buildFixtures.ts:16-31` (the cleanup bug and the serial loop)

```ts
for (const name of fixtures) {
  const path = join(dir, name)
  if (existsSync(join(path, 'dist')))
    await rm(join(path, 'dist')).catch(() => {})   // <-- no { recursive: true }: rejects ERR_FS_EISDIR, swallowed

  if (isBun) {
    console.log(c.magentaBright.inverse.bold`\n  Bun  `, name, '\n')
    execSync('bun --version', { cwd: path, stdio: 'inherit' })
    execSync('bun bun.config.js', { cwd: path, stdio: 'inherit' })
    continue // skip other builders in bun environment
  }

  console.log(c.yellow.inverse.bold`\n  Vite  `, name, '\n')
  execSync('npx vite --version', { cwd: path, stdio: 'inherit' })
  execSync('npx vite build', { cwd: path, stdio: 'inherit' })
  // ... Rollup, Webpack, Esbuild, Rspack, Rsbuild, Farm follow the same two-line pattern
```

### Excerpt: `test/unit-tests/webpack/virtual-cache.test.ts:37-48` (the correct pattern to promote)

```ts
/** Run one webpack compilation and reject on errors. */
function runCompiler(compiler: webpack.Compiler) {
  return new Promise<void>((done, reject) => {
    compiler.run((error, stats) => {
      if (error)
        reject(error)
      else if (stats?.hasErrors())
        reject(new Error(stats.toString({ errors: true, errorDetails: true })))
      else
        done()
    })
  })
}
```

### Excerpt: `test/unit-tests/filter/filter.test.ts:153-163` (the pattern to replace — appears in 8 files, 16 call sites)

```ts
    await new Promise((resolve) => {
      build.webpack(
        {
          entry: path.resolve(__dirname, 'test-src/entry.js'),
          plugins: [
            plugin(),
          ],
        },
        resolve,
      )
    })
```

The same shape with `build.rspack(` appears in the sibling `it('rspack', …)` blocks. Full list of files containing `build.webpack(` or `build.rspack(` with a bare `resolve` callback: `filter/filter.test.ts`, `resolve-id/resolve-id.test.ts`, `resolve-id-external/resolve-id-external.test.ts`, `id-consistency/id-consistency.test.ts`, `virtual-id/virtual-id.test.ts`, `write-bundle/write-bundle.test.ts`, `framework-version/index.test.ts`. (`build-end/build-end.test.ts:34-55` already checks `hasErrors`; leave its inline version or switch it to the helper — either is fine.)

### Excerpt: `test/unit-tests/webpack/loaders/transform.test.ts:172-181` (the accidental-pass filter)

```ts
      mockLoaderContext.query = {
        plugin: {
          transform: {
            handler: vi.fn().mockResolvedValue({ code: 'transformed code', map: result }),
            filter: vi.fn().mockReturnValue(true),   // <-- normalizeObjectHook reads filter.id / filter.code; both undefined → matches everything
          },
        },
      }
```

`src/utils/filter.ts:181-193` shows why: for `name === 'transform'` it does `createFilterForTransform(transformFilter?.id, transformFilter?.code)`, and when both are `undefined` the result is `undefined` → `filter || (() => true)`. A `vi.fn()` filter therefore *always matches*; tests that use `mockReturnValue(false)` and expect pass-through only pass because the handler mock returns `undefined`, which also passes through. Search both loader test files for `filter: vi.fn()` to find every instance.

### Conventions

- Tests use vitest with `describe`/`it`/`expect`, imported from `'vitest'`. Integration tests import `createUnplugin` from `'unplugin'` (aliased to `src/index.ts` in `vitest.config.ts`).
- Style is enforced by `@antfu/eslint-config` (`pnpm lint`); no semicolons, single quotes, 2-space indent, `if` bodies on their own line without braces when single-statement.
- Comments are rare and explain *why*. Don't add comments that restate code.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Build (required before any webpack/rspack integration test) | `pnpm build` | exit 0, `dist/webpack/loaders/transform.mjs` exists |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Unit tests only (after this plan) | `pnpm test:unit` | all pass |
| One test file | `pnpm vitest run test/unit-tests/filter` | all pass |
| Fixture builds | `pnpm test:build` | exit 0, `test/fixtures/*/dist/*` populated |
| Full suite | `pnpm test` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `package.json` (scripts only)
- `scripts/buildFixtures.ts`
- `test/unit-tests/utils.ts`
- `test/unit-tests/{filter,resolve-id,resolve-id-external,id-consistency,virtual-id,write-bundle,framework-version,build-end}/*.test.ts` — only the `build.webpack(`/`build.rspack(` call sites
- `test/unit-tests/webpack/virtual-cache.test.ts` — only to swap its local `runCompiler` for the shared one (optional)
- `test/unit-tests/webpack/loaders/transform.test.ts`, `test/unit-tests/rspack/loaders/transform.test.ts` — only the `filter: vi.fn()` sites
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- Anything under `src/` — this plan changes no runtime behaviour. If making a test honest reveals a real bug, record it in your report and leave the test failing-but-correct only if you can't `it.todo` it; prefer `it.todo` with the bug description.
- `test/utils.ts` (`onlyBun`) — the `it.only`-under-Bun behaviour is deliberate (the CI Bun matrix job runs with `--allowOnly` and only wants Bun tests).
- `test/unit-tests/virtual-id/virtual-id.test.ts:142` `it.skip('rspack', …)` — leave the skip; it's a known unresolved rspack case.
- CI workflow files.

## Git workflow

- Branch: `test/harness-cold-start` (create from the base branch in a fresh worktree)
- Conventional Commits, e.g. `test: reject webpack and rspack builds that report errors`, `chore: make fixture cleanup and builds reliable`. Recent examples from `git log`: `fix: preserve transform sourcemaps for webpack and rspack (#626)`, `chore: lint`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Fix fixture cleanup and drop the `--version` spawns

In `scripts/buildFixtures.ts`:
- Replace `await rm(join(path, 'dist')).catch(() => {})` with `await rm(join(path, 'dist'), { recursive: true, force: true })` and drop the `existsSync` guard (force handles absence).
- Delete every `execSync('npx <tool> --version', …)` / `execSync('bun --version', …)` line. Print the version once at the top instead if you want (optional; a plain `console.log` of the bundler name is enough).
- Accept an optional second positional arg to filter by bundler name, e.g. `node scripts/buildFixtures.ts transform webpack` builds only the webpack config of the `transform` fixture. Keep the first positional (fixture-name filter) as is. Implement it as a table of `{ name, command }` pairs filtered by `process.argv[3]` rather than seven `if` blocks.

**Verify**: `pnpm test:build load` → exit 0; `ls test/fixtures/load/dist` lists `vite rollup webpack esbuild rspack rsbuild farm`. Then run `pnpm test:build load webpack` → exit 0 and only the webpack subdirectory is fresh (check `ls -la --time-style=full-iso test/fixtures/load/dist`).

### Step 2: Run the per-fixture bundler builds concurrently

Still in `scripts/buildFixtures.ts`: switch from `execSync` to `node:child_process` `exec` wrapped in a promise (or `execFile`), and run the bundlers for one fixture with `Promise.all`. Each bundler writes to its own `dist/<bundler>` subdirectory (see e.g. `test/fixtures/transform/webpack.config.js` output path), so this is safe. Keep fixtures sequential (simpler logs). Keep the Bun branch (`isBun`) unchanged in behaviour: under Bun, only `bun bun.config.js` runs.

Capture stdout/stderr per bundler and print it after the build finishes so interleaved logs stay readable. On any non-zero exit, print that bundler's output and exit the script with code 1 after the other builds in the group finish.

**Verify**: `pnpm test:build` → exit 0; wall-clock is visibly shorter than before (not asserted). `pnpm vitest run test/fixtures` → all pass.

### Step 3: Add a `test:unit` script and make `test` build first

In `package.json` scripts:
- Add `"test:unit": "vitest run test/unit-tests"`.
- Change `"test"` to `"nr build && nr test:build && vitest run"`.

Rationale to keep in mind (don't write it as a comment in `package.json`, JSON has none): webpack/rspack integration tests load loaders from `dist/`, so `test` must guarantee a build. `test:unit` is the fast loop for contributors who already built.

**Verify**: `rm -rf dist && pnpm test` → exit 0 (this proves the cold path). Then `pnpm test:unit` → exit 0.

### Step 4: Add shared `runWebpack` / `runRspack` helpers that reject on errors

In `test/unit-tests/utils.ts`, add:

```ts
export function runWebpack(options: webpack.Configuration): Promise<webpack.Stats> {
  return new Promise((resolve, reject) => {
    webpackBuild(options, (error, stats) => {
      if (error)
        reject(error)
      else if (stats?.hasErrors())
        reject(new Error(stats.toString({ all: false, errors: true, errorDetails: true })))
      else
        resolve(stats!)
    })
  })
}

export function runRspack(options: rspack.RspackOptions): Promise<rspack.Stats> {
  // identical shape using rspackBuild
}
```

Type the `stats!` assertion away if the callback types allow it; if not, keep `!` and add a one-line comment why (webpack's callback types `stats` as optional even on success).

**Verify**: `pnpm typecheck` → exit 0.

### Step 5: Replace the bare-`resolve` call sites

In each file listed in Scope, replace

```ts
await new Promise((resolve) => {
  build.webpack({ ...config }, resolve)
})
```

with `await runWebpack({ ...config })`, and the rspack twin with `await runRspack(...)`. Import the helpers from `'../utils'`. Where a test stores the returned `stats` (none do today, but check), keep the variable.

`write-bundle.test.ts:129-131` selects config by `webpackVersion!.startsWith('4')`; keep that expression as the argument.

**Verify**: `pnpm build && pnpm vitest run test/unit-tests/filter test/unit-tests/resolve-id test/unit-tests/resolve-id-external test/unit-tests/id-consistency test/unit-tests/virtual-id test/unit-tests/write-bundle test/unit-tests/framework-version test/unit-tests/build-end` → all pass. If any test now *fails* because the build has errors, that is a real finding: do not weaken the assertion. Record the failure output in your report and mark the test `it.todo` with a one-line description of the error (see STOP conditions).

### Step 6: Make the loader filter tests honest

In `test/unit-tests/webpack/loaders/transform.test.ts` and `test/unit-tests/rspack/loaders/transform.test.ts`, find every `filter: vi.fn()…` inside a `plugin.transform` object and replace with a real filter shape:

- Where the intent is "filter matches": `filter: { id: /./ }` (or omit the filter entirely).
- Where the intent is "filter does not match" and the test expects pass-through: `filter: { id: /\.never-matches$/ }` with a `mockLoaderContext.resource` that does not end with that, **and** add `expect(handler).not.toHaveBeenCalled()` so the test fails if the handler runs.

The correct pattern already exists in `test/unit-tests/rspack/loaders/transform.test.ts:39-60` (the lazy-filter test uses a real `{ id: {...}, code: {...} }` object).

**Verify**: `pnpm vitest run test/unit-tests/webpack/loaders test/unit-tests/rspack/loaders` → all pass; `grep -n "filter: vi.fn" test/unit-tests/webpack/loaders/transform.test.ts test/unit-tests/rspack/loaders/transform.test.ts` → no output.

### Step 7: Lint and full run

**Verify**: `pnpm lint` → exit 0; `pnpm typecheck` → exit 0; `rm -rf dist && pnpm test` → exit 0.

## Test plan

No new behaviour is under test; this plan makes existing tests trustworthy. Checks that must hold afterwards:

- `rm -rf dist test/fixtures/*/dist && pnpm test` passes from a clean state.
- Temporarily break a webpack build (e.g. point `entry` at a non-existent file in one test) and confirm the test now **fails** with a webpack error message; revert.
- Temporarily make a transform loader test's handler return `'changed'` while the filter does not match; confirm the test **fails**; revert.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `rm -rf dist test/fixtures/*/dist && pnpm test` exits 0
- [ ] `pnpm test:unit` exists and exits 0 after `pnpm build`
- [ ] `grep -rn "build.webpack(\|build.rspack(" test/unit-tests --include=*.test.ts` returns no matches outside `test/unit-tests/utils.ts`
- [ ] `grep -n "filter: vi.fn" test/unit-tests/webpack/loaders test/unit-tests/rspack/loaders -r` returns nothing
- [ ] `grep -n "recursive: true" scripts/buildFixtures.ts` matches
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- After Step 5, more than two integration tests fail because the real build reports errors. One or two → mark `it.todo` with the error text and continue; more than two suggests an environment problem (missing build, wrong Node) rather than real bugs.
- Fixing a test seems to require changing anything under `src/`.
- `pnpm install` fails or `pnpm build` fails before you have changed anything (environment problem, not yours to fix).

## Maintenance notes

- Plans 002, 003, 007 and 009 rely on `runWebpack`/`runRspack` rejecting on `stats.hasErrors()`. If someone later re-introduces a bare-callback build in a test, the error-hiding returns.
- When a loader in `src/{webpack,rspack}/loaders/` changes, integration tests only see it after `pnpm build`. Plan 010 (AGENTS.md) documents this; until then it lives here.
- Deferred: running fixtures across *fixtures* in parallel (only bundlers within a fixture are parallelised here) — not worth the log noise.
- Deferred: `vitest.config.ts` has a `coverage` block but no coverage provider is installed; either add `@vitest/coverage-v8` + a `test:coverage` script or delete the block. Not done here because it's a maintainer preference.
