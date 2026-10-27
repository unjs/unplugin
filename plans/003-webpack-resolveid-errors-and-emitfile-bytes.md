# Plan 003: Surface webpack `resolveId` errors as build errors and emit `Uint8Array` assets byte-exactly

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1ea89aa..HEAD -- src/webpack/index.ts src/webpack/context.ts test/unit-tests/webpack/context.test.ts test/unit-tests/resolve-id/resolve-id.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-test-harness.md (for `runWebpack`/`runRspack` that reject on build errors)
- **Category**: bug
- **Planned at**: commit `1ea89aa`, 2026-10-27

## Why this matters

Two independent, small bugs in the webpack adapter:

1. The webpack resolver tap is registered with `tapAsync` but given an `async` function with no `try/catch`. Tapable ignores the returned promise, so when a user's `resolveId` hook throws (or `decodeURIComponent` throws on a malformed importer), the `callback` is never called and the rejection is unhandled. In `webpack --watch` / dev servers that is a process crash instead of a normal "Module build failed" error; in a one-shot build the resolve just hangs until Node exits. The rspack adapter uses `tapPromise` and does not have this problem; commit `839da03` (#610) fixed the equivalent gap in the webpack *load loader*, but not in the resolver.

2. `getSource()` in `src/webpack/context.ts` converts a `Uint8Array` with `Buffer.from(fileSource.buffer)`. That wraps the *entire* underlying `ArrayBuffer`, ignoring `byteOffset` and `byteLength`. Node allocates small Buffers from a shared 8 KiB pool, so `this.emitFile({ source: Buffer.from('…') })` emits the whole pool (wrong size, garbage bytes). The rspack context already does this correctly with `Buffer.from(emittedFile.source)`.

## Current state

Files:

- `src/webpack/index.ts:120-234` — resolver plugin; the `tapAsync` body.
- `src/webpack/context.ts:25-33` — `getSource`.
- `test/unit-tests/webpack/context.test.ts` — unit tests for the webpack build context (uses a mock `compilation.emitAsset`); line 43 calls `buildContext.emitFile({ fileName: 'output.js', source: 'content' })`.
- `test/unit-tests/resolve-id/resolve-id.test.ts` — cross-bundler `resolveId` integration tests (vite, rollup, rolldown, webpack, rspack, esbuild, bun); good home for a "throwing resolveId rejects the build" case.

### Excerpt: `src/webpack/index.ts:123-134` and `:186-233`

```ts
                resolver
                  .getHook('resolve')
                  .tapAsync(plugin.name, async (request, resolveContext, callback) => {
                    if (!request.request)
                      return callback()

                    // filter out invalid requests
                    if (normalizeAbsolutePath(request.request).startsWith(plugin.__virtualModulePrefix))
                      return callback()

                    const id = normalizeAbsolutePath(request.request)
                    // ...
                    const resolveIdResult = await handler.call!({
                      ...context,
                      ...pluginContext,
                    }, id, importer, { isEntry })

                    if (error != null)
                      return callback(error)
                    if (resolveIdResult == null)
                      return callback()
                    // ...
                    // redirect the resolver
                    resolver.doResolve(target, newRequest, null, resolveContext, callback)
                  })
```

There is no `try`/`catch` anywhere in this function body. Note the existing `error` variable: `pluginContext.error(msg)` records a message and the code returns `callback(error)` after the handler — that path is fine; the missing piece is a *thrown* error / rejected promise.

### Excerpt: `src/webpack/context.ts:25-33`

```ts
const require = createRequire(import.meta.url)
export function getSource(fileSource: string | Uint8Array): sources.RawSource {
  const webpack = require('webpack')
  return new webpack.sources.RawSource(
    typeof fileSource === 'string'
      ? fileSource
      : Buffer.from(fileSource.buffer),
  )
}
```

### Excerpt: `src/rspack/context.ts:30-40` (correct reference)

```ts
        const { sources } = compilation.compiler.webpack
        compilation.emitAsset(
          outFileName,
          new sources.RawSource(
            typeof emittedFile.source === 'string'
              ? emittedFile.source
              : Buffer.from(emittedFile.source),
          ),
        )
```

### Excerpt: how the webpack load loader handles thrown errors, `src/webpack/loaders/load.ts:48-55` (pattern to mirror)

```ts
  catch (error) {
    if (error instanceof Error) {
      callback(error)
    }
    else {
      callback(new Error(String(error)))
    }
  }
```

### Conventions

- Error normalisation to `Error` instances as above.
- Tests for the webpack context live in `test/unit-tests/webpack/context.test.ts` and pass a mock `compilation` with `emitAsset: vi.fn()`; assert on what `emitAsset` received. `webpack.sources.RawSource` has `.buffer()` returning a `Buffer` and `.source()` returning string|Buffer — use `.buffer()` to compare bytes.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Build (integration tests need `dist/`) | `pnpm build` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Context unit tests | `pnpm vitest run test/unit-tests/webpack/context.test.ts` | all pass |
| resolveId integration tests | `pnpm build && pnpm vitest run test/unit-tests/resolve-id` | all pass |
| Full suite | `pnpm test` | exit 0 |

## Scope

**In scope**:
- `src/webpack/index.ts` — only the `tapAsync` callback body
- `src/webpack/context.ts` — only `getSource`
- `test/unit-tests/webpack/context.test.ts`
- `test/unit-tests/resolve-id/resolve-id.test.ts`
- `plans/README.md`

**Out of scope**:
- Changing the resolver's target hook, the virtual-module prefix, or the double-invocation behaviour (`doResolve` back into `resolve`) — known, risky, tracked separately in `plans/README.md`.
- `src/rspack/**` — already correct for both issues.
- Extracting shared code with rspack — plan 009.

## Git workflow

- Branch: `fix/webpack-resolve-errors-and-emit-bytes`
- Commits: `fix(webpack): forward resolveId hook errors to the resolver callback`, `fix(webpack): emit Uint8Array assets with their own byte range`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a failing test — a throwing `resolveId` must reject the webpack build

In `test/unit-tests/resolve-id/resolve-id.test.ts`, add a new `describe('resolveId errors', …)` with cases for `webpack` and `rspack` (rspack already behaves correctly; the test documents parity):

```ts
it('webpack rejects the build when resolveId throws', async () => {
  const plugin = createUnpluginWithCallback(() => {
    throw new Error('resolveId exploded')
  }).webpack
  await expect(runWebpack({
    entry: path.resolve(__dirname, 'test-src/entry.js'),
    plugins: [plugin()],
  })).rejects.toThrow(/resolveId exploded/)
})
```

Use `runWebpack`/`runRspack` from `../utils` (added by plan 001). Set a per-test timeout of ~10 s so a hang fails fast rather than hitting vitest's default: `it('…', async () => { … }, 10_000)`.

**Verify**: `pnpm build && pnpm vitest run test/unit-tests/resolve-id` → the new webpack test **fails** (timeout or unhandled rejection), the rspack one passes.

### Step 2: Wrap the resolver tap body in try/catch

In `src/webpack/index.ts`, restructure the `tapAsync` callback so the whole body after the two early `return callback()` guards is inside `try { … } catch (error) { … }`, with the catch mirroring the load loader:

```ts
                    catch (error) {
                      callback(error instanceof Error
                        ? error
                        : new Error(String(error)))
                    }
```

Make sure `resolver.doResolve(target, newRequest, null, resolveContext, callback)` remains the last statement in the `try` and that `callback` is invoked exactly once on every path (every `return callback(...)` already does; the catch handles the throw path). Do not change any other logic.

**Verify**: `pnpm typecheck` → exit 0. `pnpm build && pnpm vitest run test/unit-tests/resolve-id` → all pass, including the new webpack test.

### Step 3: Add a failing test — `emitFile` with a small Buffer emits exactly those bytes

In `test/unit-tests/webpack/context.test.ts`, add:

```ts
it('emits a Uint8Array source byte for byte, not its backing pool', () => {
  const emitAsset = vi.fn()
  const context = createBuildContext(options, compiler, { emitAsset } as any)
  const bytes = Buffer.from('tiny')   // small Buffers are slices of a shared pool
  context.emitFile({ type: 'asset', fileName: 'a.bin', source: bytes })
  const [, rawSource] = emitAsset.mock.calls[0]
  expect(Buffer.from(rawSource.buffer()).equals(bytes)).toBe(true)
})
```

Adapt variable names to the existing fixtures in that file (look at how the other `emitFile` test builds `compiler`/`compilation`). The key assertion is that the emitted `RawSource.buffer()` has length 4 and equals `bytes`.

**Verify**: `pnpm vitest run test/unit-tests/webpack/context.test.ts` → the new test **fails** (length is 8192 or similar).

### Step 4: Fix `getSource`

In `src/webpack/context.ts`, replace `Buffer.from(fileSource.buffer)` with `Buffer.from(fileSource)` (copies exactly `byteLength` bytes starting at `byteOffset`). If you prefer zero-copy, `Buffer.from(fileSource.buffer, fileSource.byteOffset, fileSource.byteLength)` is also acceptable; the simple form matches `src/rspack/context.ts`.

**Verify**: `pnpm vitest run test/unit-tests/webpack/context.test.ts` → all pass. `pnpm typecheck` → exit 0.

### Step 5: Lint and full run

**Verify**: `pnpm lint` → exit 0; `pnpm test` → exit 0.

## Test plan

- `resolve-id.test.ts`: webpack and rspack builds reject with the hook's error message when `resolveId` throws (2 new tests).
- `webpack/context.test.ts`: `emitFile` with a pooled `Buffer` emits exactly its bytes (1 new test).
- Pattern files: the existing `it('webpack', …)` in `resolve-id.test.ts`; existing `emitFile` test in `webpack/context.test.ts`.

## Done criteria

- [ ] `grep -n "catch (error)" src/webpack/index.ts` → at least 1 match inside the resolver tap
- [ ] `grep -n "fileSource.buffer)" src/webpack/context.ts` → no match
- [ ] `pnpm typecheck` and `pnpm lint` exit 0
- [ ] `pnpm build && pnpm vitest run test/unit-tests/resolve-id test/unit-tests/webpack/context.test.ts` → all pass, 3 new tests
- [ ] `pnpm test` exits 0
- [ ] Only in-scope files modified; `plans/README.md` updated

## STOP conditions

- The resolver tap already contains a `try`/`catch` (fixed independently).
- After Step 2 the webpack test still times out — the rejection is happening somewhere other than the handler call (e.g. inside `doResolve`); report with the stack trace.
- The `rejects.toThrow` message doesn't contain the hook's text because webpack wraps it; relax to `rejects.toThrow()` **only if** the error output printed by `runWebpack` clearly contains `resolveId exploded` — and say so in the report.

## Maintenance notes

- Plan 009 will extract the shared resolveId invocation core for webpack and rspack; the `try/catch` added here must survive as the webpack-specific wrapper around `callback`.
- Reviewers: confirm no code path in the tap can call `callback` twice (once in `try`, once in `catch`). `doResolve` calls `callback` itself asynchronously; if it throws *synchronously* before doing so, the catch is the only caller. That's the intended behaviour.
