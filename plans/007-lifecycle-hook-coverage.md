# Plan 007: Cover the lifecycle hooks that have no real-bundler tests (`watchChange`, `buildEnd`/`emitFile` on rspack/esbuild/bun, fixture sourcemaps)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1ea89aa..HEAD -- test/unit-tests/build-end test/unit-tests/watch-change test/fixtures/load/__test__ test/fixtures/transform/__test__ test/unit-tests/utils.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (tests only; any `src/` change discovered is reported, not made)
- **Depends on**: plans/001-test-harness.md (`runWebpack`/`runRspack`), plans/002-rspack-loader-parity.md (rspack `buildEnd` on `processAssets`; otherwise its new test will fail for a known reason)
- **Category**: tests
- **Planned at**: commit `1ea89aa`, 2026-10-27

## Why this matters

The last five fixes in this repo (#610, #617, #619, #623, #626) were all in adapter plumbing: loaders, virtual modules, `buildEnd` timing, sourcemaps. The test map shows exactly those areas are thin: `watchChange` has **no** real-bundler test on any adapter (only a Farm mock test that doesn't even assert the event); `buildEnd` + `emitFile` is tested on webpack only; esbuild and Bun `emitFile` (which write directly to `outdir`) are untested; the fixtures emit sourcemaps that no assertion ever opens. This plan is test-only: it adds the coverage so the next one-sided fix is caught.

## Current state

Files:

- `test/unit-tests/build-end/build-end.test.ts` — webpack `buildEnd` → `emitFile` integration test; the model for the new cases. Writes to `test/unit-tests/build-end/test-out`, cleaned in `beforeAll`.
- `test/unit-tests/write-bundle/write-bundle.test.ts` — cross-bundler suite with `webpack`, `rspack`, `esbuild`, `bun` (`onlyBun`) cases, each building `test-src/entry.js` to `test-out/<bundler>`; shows the esbuild/Bun build option shapes.
- `test/unit-tests/utils.ts` — `build.*` wrappers plus (after plan 001) `runWebpack`/`runRspack`.
- `test/utils.ts` — `onlyBun`.
- `src/webpack/index.ts:273-294` and `src/rspack/index.ts:264-285` — `watchChange` is dispatched from `compiler.hooks.make` using `compiler.modifiedFiles` / `compiler.removedFiles` with `event: 'update'` / `'delete'`.
- `src/esbuild/index.ts:182-190` — `buildEnd`/`writeBundle` via `onEnd`; `src/esbuild/utils.ts:143-152` — `emitFile` writes `path.resolve(initialOptions.outdir, fileName)` (requires `outdir`, not `outfile`).
- `src/bun/index.ts:289-300` — `buildEnd`/`writeBundle` via `onEnd`; `src/bun/utils.ts:50-59` — `emitFile` writes under `build.config.outdir`.
- `test/fixtures/load/webpack.config.js` has `devtool: 'source-map'`; `test/fixtures/load/vite.config.js` enables sourcemaps; `test/fixtures/*/__test__/build.test.ts` only reads `main.js`.

### Excerpt: `src/webpack/index.ts:273-289`

```ts
          if (plugin.watchChange || plugin.buildStart) {
            compiler.hooks.make.tapPromise(plugin.name, async (compilation) => {
              const context = createBuildContext(contextOptionsFromCompilation(compilation), compiler, compilation)
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
```

### Excerpt: `test/unit-tests/write-bundle/write-bundle.test.ts:164-181` (esbuild build shape)

```ts
    await build.esbuild({
      entryPoints: [path.resolve(__dirname, 'test-src/entry.js')],
      plugins: [plugin()],
      bundle: true, // actually traverse imports
      outfile: path.resolve(__dirname, 'test-out/esbuild/output.js'),
      format: 'cjs',
      sourcemap: true,
    })
```

For `emitFile` on esbuild use `outdir` instead of `outfile` (see `src/esbuild/utils.ts:145`: `if (initialOptions.outdir && …)`).

### Conventions

- One `test/unit-tests/<topic>/` directory per behaviour, with `it('<bundler>', …)` per adapter and a shared `check…` function; Bun cases use `onlyBun`.
- Output under `test-out/` inside the topic directory; `.gitignore` already ignores `test-out`.
- Temp source files for watch tests: `fs.mkdtempSync(path.join(os.tmpdir(), 'unplugin-'))`, cleaned in `afterEach`.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Install + build | `pnpm install && pnpm build` | exit 0 |
| New suites | `pnpm vitest run test/unit-tests/build-end test/unit-tests/watch-change` | all pass |
| Fixture suites | `pnpm test:build && pnpm vitest run test/fixtures` | all pass |
| Bun (if available) | `bun -b vitest run --allowOnly test/unit-tests/build-end test/unit-tests/watch-change` | all pass |
| Full | `pnpm test` | exit 0 |

## Scope

**In scope**:
- `test/unit-tests/build-end/build-end.test.ts`
- `test/unit-tests/watch-change/` (create: `watch-change.test.ts`)
- `test/fixtures/load/__test__/build.test.ts`, `test/fixtures/transform/__test__/build.test.ts`
- `test/unit-tests/utils.ts` — only if a small `runWebpackWatch`/`runRspackWatch` helper is needed
- `plans/README.md`

**Out of scope**:
- Anything under `src/`. If a new test exposes a bug, mark the test `it.todo('<bundler>: <one-line bug description>')` (or `it.fails` if the repo prefers) and list it in your report under "bugs found".
- Fixture configs (`test/fixtures/*/{webpack,vite,...}.config.js`) — only the `__test__` assertions change.
- `test/unit-tests/farm/*` — Farm has no programmatic build harness in this repo; see plan 005 maintenance notes.

## Git workflow

- Branch: `test/lifecycle-hook-coverage`
- Commits: `test: cover buildEnd emitFile on rspack, esbuild and bun`, `test: cover watchChange on webpack and rspack`, `test: assert fixture sourcemaps map back to the source`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: `buildEnd` → `emitFile` on esbuild and Bun

In `test/unit-tests/build-end/build-end.test.ts` (which after plan 002 has webpack and rspack cases), add:

- `it('esbuild allows emitting assets from buildEnd', …)`: `createUnplugin(() => ({ name, buildEnd() { this.emitFile({ type: 'asset', fileName: 'build-end.json', source: '{"emitted":true}' }) } })).esbuild`; `build.esbuild({ entryPoints: [entry], bundle: true, outdir: path.join(outputPath, 'esbuild'), format: 'cjs', plugins: [plugin()] })`; assert `fs.readFileSync(path.join(outputPath, 'esbuild', 'build-end.json'), 'utf8') === '{"emitted":true}'`.
- `onlyBun('bun allows emitting assets from buildEnd', …)`: same with `build.bun({ entrypoints: [entry], outdir: path.join(outputPath, 'bun'), plugins: [plugin()] })`.

Reuse the entry `path.resolve(__dirname, '../write-bundle/test-src/entry.js')` the webpack case already uses.

**Verify**: `pnpm build && pnpm vitest run test/unit-tests/build-end` → all pass (esbuild). If Bun is installed, run the Bun command too.

### Step 2: `watchChange` on webpack and rspack

Create `test/unit-tests/watch-change/watch-change.test.ts`:

1. In `beforeEach`, create a temp dir with `entry.js` containing `import './dep.js'; console.log('entry')` and `dep.js` containing `export const a = 1`.
2. For webpack: create the compiler via `build.webpack({ mode: 'development', context: dir, entry: path.join(dir, 'entry.js'), output: { path: path.join(dir, 'dist'), filename: 'main.js' }, plugins: [plugin()] })` **without** a callback (returns a `Compiler`), then `const watching = compiler.watch({ aggregateTimeout: 50 }, handler)`. Use a small promise-based helper that resolves on each successful compilation (`stats.hasErrors()` → reject). After the first compilation resolves, `fs.writeFileSync(path.join(dir, 'dep.js'), 'export const a = 2')`, await the second compilation, then `await new Promise(r => watching.close(r))`.
3. Plugin: `createUnplugin(() => ({ name: 'watch-change-test', watchChange: watchChangeMock }))` where `watchChangeMock = vi.fn()`.
4. Assert `watchChangeMock` was called with `(path.join(dir, 'dep.js'), { event: 'update' })` and that `this` inside the call has `addWatchFile`/`emitFile` (check `watchChangeMock.mock.contexts[0]` or capture `this` in the mock implementation).
5. Repeat for rspack with `build.rspack(options)` → `Compiler`, same `watch` API (`compiler.watch({ aggregateTimeout: 50 }, cb)`; close with `watching.close(cb)`).
6. Optional second case per bundler: delete `dep.js` after making `entry.js` not import it… this is fiddly (deleting an imported file errors the build). Instead assert the `'delete'` event by removing an *extra* watched file: in the plugin's `buildStart`, `this.addWatchFile(path.join(dir, 'extra.txt'))`; after the first build, `fs.rmSync(extra)`; expect a `watchChange(extra, { event: 'delete' })` call. If `compiler.removedFiles` is not populated for added watch files on either bundler, mark that case `it.todo` with the observation.

Set a per-test timeout of 20 s. Make sure both `watching.close` and `compiler.close` are awaited in `finally` so vitest exits.

**Verify**: `pnpm vitest run test/unit-tests/watch-change` → webpack and rspack `'update'` cases pass. The test must **fail** if you temporarily set `watchChange: undefined` in the plugin and assert `toHaveBeenCalled()` (sanity check — revert).

### Step 3: Assert the fixture sourcemaps

In `test/fixtures/load/__test__/build.test.ts` and `test/fixtures/transform/__test__/build.test.ts`, for the bundlers that emit a `.map` next to `main.js` (webpack: `dist/webpack/main.js.map`; vite: `dist/vite/main.js.mjs.map`; rollup, esbuild, rspack, rsbuild — check which configs set `sourcemap`/`devtool` and only assert where a map exists), add an assertion per bundler:

- read the `.map` JSON,
- assert `map.sources` contains an entry ending in `msg.js` (load fixture) / `target.js` (transform fixture),
- for the transform fixture, additionally use `@jridgewell/trace-mapping` (already a transitive dependency via `@jridgewell/remapping`; if importing it directly fails because pnpm hoisting is strict, STOP and report rather than adding a dependency) to `originalPositionFor` the generated position of the string `Injected Post` and assert `source` ends in `target.js`. If the trace-mapping import isn't available, keep only the `sources` assertion.

**Verify**: `pnpm test:build && pnpm vitest run test/fixtures` → all pass.

### Step 4: Lint and full run

**Verify**: `pnpm lint` → exit 0; `pnpm test` → exit 0.

## Test plan

- `build-end`: esbuild, bun (2 new).
- `watch-change`: webpack update, rspack update, (optionally) webpack delete, rspack delete (2–4 new).
- Fixture sourcemaps: one assertion per sourcemap-emitting bundler in two fixtures (~6–10 new assertions).

## Done criteria

- [ ] `ls test/unit-tests/watch-change/watch-change.test.ts` exists
- [ ] `grep -c "allows emitting assets from buildEnd" test/unit-tests/build-end/build-end.test.ts` → ≥ 4
- [ ] `grep -n "\.map'" test/fixtures/load/__test__/build.test.ts test/fixtures/transform/__test__/build.test.ts` → matches in both
- [ ] `pnpm lint` exits 0
- [ ] `pnpm build && pnpm vitest run test/unit-tests/build-end test/unit-tests/watch-change` → all pass
- [ ] `pnpm test` exits 0
- [ ] No files under `src/` modified; `plans/README.md` updated (including any "bugs found" list)

## STOP conditions

- A new test fails and the cause is clearly in `src/` (e.g. rspack `watchChange` never fires): mark `it.todo` with the bug text, continue, and list it in the report — do **not** edit `src/`.
- `compiler.watch` hangs past the timeout on either bundler even after `close` — environment/fs-watcher problem; report and skip the suite with a comment pointing at this plan.
- Adding a sourcemap assertion requires changing a fixture *config* (e.g. enabling `sourcemap`) — report which bundlers lack maps instead of changing configs.

## Maintenance notes

- Farm, rolldown and unloader remain outside these suites: Farm because there is no programmatic build harness in `test/unit-tests/utils.ts`; rolldown/unloader because they aren't in `scripts/buildFixtures.ts` either. Adding them is a direction item in `plans/README.md`.
- Reviewers: watch tests are the flakiest kind; the `aggregateTimeout` and explicit `close` calls are load-bearing. If CI shows flakes, increase the per-test timeout before weakening assertions.
