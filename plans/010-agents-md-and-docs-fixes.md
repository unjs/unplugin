# Plan 010: Add a contributor/agent guide with the adapter-parity checklist, and fix the stale parts of `docs/guide/index.md`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1ea89aa..HEAD -- AGENTS.md CONTRIBUTING.md docs/guide/index.md docs/guide/why-unplugin.md package.json`
> If `AGENTS.md` or `CONTRIBUTING.md` already exist, or the quoted doc lines have moved, compare before proceeding; on a substantive mismatch, treat it as a STOP condition. `package.json` drift is expected if plan 001 landed (new `test:unit` script) — use the live script names.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-test-harness.md (for the exact `test:unit`/`test:build` commands to document; if it hasn't landed, document the current scripts and note the build-first requirement anyway)
- **Category**: dx / docs
- **Planned at**: commit `1ea89aa`, 2026-10-27

## Why this matters

There is no `AGENTS.md`, `CLAUDE.md` or `CONTRIBUTING.md` in the repo. Two facts that every contributor and dispatched agent has to rediscover by hitting failures are: (1) webpack/rspack integration tests execute the loaders from `dist/`, so `pnpm build` must precede `vitest`; (2) the adapters come in pairs that must change together (webpack↔rspack index/context/loaders; esbuild↔bun; rollup→vite/rolldown/unloader), and three recent fixes (#619, #623, #610) landed on one side only. A one-page guide fixes both.

The docs site (`docs/guide/index.md`) has drifted from the code: it names an API that doesn't exist (`defineUnplugin`), states a Node floor two majors below `engines`, marks Bun's `this.addWatchFile` as supported when it is a no-op and esbuild's as unsupported when it works inside hooks, omits `unloader` from every table but one, and quotes an rspack minimum far below the peer range. Plugin authors use these tables to decide what to ship per bundler.

## Current state

### Repo facts to put in the guide

- Package manager: pnpm (`package.json` `devEngines.packageManager` = pnpm 12). Node `^20.19.0 || >=22.12.0` (`package.json:29`).
- Scripts (`package.json:38-52`): `build` (tsdown), `dev` (tsdown --watch), `lint` (eslint --cache .), `lint:fix`, `typecheck` (tsgo --noEmit), `test` (= fixture builds + vitest run), `test:build` (= `node scripts/buildFixtures.ts [fixture-filter] [bundler-filter after plan 001]`), `test:unit` (after plan 001), `release` (bumpp — **human-only**), `prepare` (skills sync).
- Dev-vs-dist loader resolution: `src/webpack/index.ts:14-28` and `src/rspack/index.ts:21-35` resolve the loader path to `../../dist/<bundler>/loaders/*.mjs` when `import.meta.dev` is true (set by `vitest.config.ts:6`), else to the published path. `src/globals.d.ts:5-15` documents `import.meta.dev`. Consequence: **run `pnpm build` before webpack/rspack integration tests and after editing any loader**.
- Test layout: `test/unit-tests/<topic>/<topic>.test.ts` with one `it('<bundler>', …)` per adapter; `test/unit-tests/utils.ts` exports `build.*` wrappers (+ `runWebpack`/`runRspack` after plan 001); `test/utils.ts` exports `onlyBun` (= `it.only` under Bun — the Bun CI job runs `bun -b vitest --allowOnly`); `test/fixtures/{load,transform,virtual-module}` are real multi-bundler builds asserted in `__test__/build.test.ts`; loader unit tests in `test/unit-tests/{webpack,rspack}/loaders`.
- Adapter pairs (the parity checklist):
  - `src/webpack/{index,context}.ts` + `loaders/{load,transform}.ts` ↔ `src/rspack/{index,context}.ts` + `loaders/{load,transform}.ts`; shared code lives in `src/utils/webpack-like.ts`.
  - `src/esbuild/{index,utils}.ts` ↔ `src/bun/{index,utils}.ts` (Bun was modelled on esbuild).
  - `src/rollup/index.ts` is consumed by `src/vite/index.ts`, `src/rolldown/index.ts`, `src/unloader/index.ts`.
  - `src/rsbuild/index.ts` wraps `getRspackPluginFromRaw` from rspack.
  - Cross-cutting: `src/utils/filter.ts` (hook filters; all adapters), `src/types.ts` (public API), `docs/guide/index.md` tables (update when hook support changes).
- Style: `@antfu/eslint-config`; `pnpm lint --fix` formats. Conventional Commits (`fix(webpack): …`, `feat: …`, `chore: …`). Comments explain *why*, sparingly.
- Releases: `pnpm release` (bumpp) + tag triggers `.github/workflows/release.yml`; never run by agents.

### Doc lines to fix (`docs/guide/index.md` at `1ea89aa`)

- `:43` — `- Node.js 18.12.0 or later.` → should match `engines`: `Node.js 20.19.0 or later (or 22.12.0+).`
- `:10-22` "currently supports" list — add `[Unloader](https://github.com/sxzz/unloader)` (verify the URL from `pnpm-workspace.yaml`/the package's `homepage` with `pnpm view unloader homepage` if network is available; otherwise link to the npm page `https://www.npmjs.com/package/unloader`).
- `:230-242` Supported Hooks table — add an **Unloader** column. Values: mirror the Rollup column (`src/unloader/index.ts` delegates to `toRollupPlugin`; check `src/unloader/index.ts` and `src/rollup/index.ts` to confirm which hooks are wired — `enforce` ❌ like Rollup, everything else ✅ as Rollup).
- `:252` footnote 5 — `Rspack and Rsbuild support resolveId with a minimum required Rspack version of v1.0.0-alpha.1.` Keep as history but add: virtual modules without the on-disk fallback need Rspack ≥ 1.5 (`src/rspack/index.ts:109-113` uses `compiler.rspack.experiments.VirtualModulesPlugin` when present). Do **not** promise removal of the fallback; that's an open decision in `plans/README.md`.
- `:332-339` Supported Context table — add an **Unloader** column (same as Rollup). Fix two cells:
  - `this.addWatchFile` / `this.getWatchFiles` for **esbuild**: ❌ → ✅ with a new footnote "inside `resolveId`/`load`/`transform` only; throws elsewhere" (`src/esbuild/utils.ts:140-142` throws at build level; `src/esbuild/utils.ts:174-176` + `src/esbuild/index.ts:225,279,335` forward `watchFiles` from hooks).
  - `this.addWatchFile` / `this.getWatchFiles` for **Bun**: ✅ → ❌ with footnote "`Bun.build` has no watch mode; calls are accepted but have no effect" (`src/bun/utils.ts:44-49` only pushes to a local array).
  - Add a row for `this.getNativeBuildContext` (CHANGELOG 1.14.0 feature; typed in `src/types.ts:66`): ✅ for webpack, esbuild, Rspack, Rsbuild, Farm, Bun; ❌ for Rollup, Vite, Rolldown, Unloader with footnote "on Rollup-compatible hosts `this` *is* the native plugin context".
- `:341-345` footnote 1 on `setParseImpl` — add: "`setParseImpl` is process-global: the last call wins for every unplugin in the process."
- `:354-356` Nested table — leave values; add an **Unloader** column (✅, it goes through `toRollupPlugin` like Vite).
- `:411` comment `// vite | rollup | webpack | esbuild | rspack | rsbuild | farm | bun` → add `rolldown | unloader` (matches `SupportedFramework` in `src/types.ts:191`).
- `:479` `defineUnplugin(` → `createUnplugin(` (no `defineUnplugin` exists; `src/define.ts:13`). Check the `twoslash` block still type-checks: `createUnplugin` returns an instance, so the example assigning `unpluginFactory` should instead be `const unplugin = createUnplugin((options, meta) => { … })` — or keep the factory shape and type it as `UnpluginFactory<Options>` without any wrapper. Pick whichever keeps the surrounding prose (`meta.versions[meta.framework]`) correct.
- `:512-545` `create*Plugin` list — add `createUnloaderPlugin` (exported at `src/define.ts:101`).
- `:214-222` Astro snippet imports `unplugin-turbo-console/astro` while every sibling uses `unplugin-starter`; change to `unplugin-starter/astro` for consistency (it's illustrative).
- Filters section `:296-328` — add after the code block, before the Rolldown link, four bullets: relative string globs are resolved against `process.cwd()` when the plugin is created; absolute globs are used as-is; `code` string filters are substring matches; on Rollup < 4.40 / Vite < 7 the filter is applied by unplugin in JS, on newer versions (and always on Rolldown) it is forwarded natively — the gate is `supportNativeFilter` in `src/rollup/index.ts:133-147` (`viteVersion` present ⇒ Vite ≥ 7; `rollupVersion` ≥ 4.40; rolldown always).
- `docs/guide/why-unplugin.md` body is `TODO` and the page is hidden from the sidebar (`docs/.vitepress/config.ts:39-45`). Either write 3 short paragraphs (the "common subset of Rollup's plugin API + per-bundler escape hatches" principle already stated at `index.md:395`, when to use unplugin vs a native plugin, what it deliberately does not try to do) and add it to the sidebar, or delete the file. Prefer writing it — ask no one; keep it under 150 words.

### Conventions

- Markdown is linted/formatted by `eslint-plugin-format` with dprint (`eslint.config.js` `formatters.markdown: 'dprint'`); run `pnpm lint --fix` after editing docs. Tables are aligned by the formatter.
- `docs/guide/index.md` code blocks tagged `twoslash` are type-checked at docs build time (`@shikijs/vitepress-twoslash`); `pnpm docs:build` will fail if an example doesn't compile.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Install + build | `pnpm install && pnpm build` | exit 0 |
| Lint (also formats markdown) | `pnpm lint --fix` then `pnpm lint` | exit 0 |
| Docs build (type-checks twoslash blocks) | `pnpm docs:build` | exit 0 |
| Docs dev preview (optional) | `pnpm docs:dev --host 0.0.0.0` | serves on :5173 |
| Sanity | `pnpm typecheck` | exit 0 (AGENTS.md doesn't affect it; just confirms nothing else broke) |

If `pnpm docs:build` fails for a reason unrelated to your edits (network fetch of repository data, missing `GITHUB_TOKEN`), note it and verify the twoslash blocks by running `pnpm -C docs run build` once more after setting `docs/.env` as `docs/.env.example` describes — do not commit any token. If it still fails on data fetching, that's a STOP condition only if the failure points at your edited blocks.

## Scope

**In scope**:
- `AGENTS.md` (create, repo root)
- `CONTRIBUTING.md` (create as a 3-line pointer to `AGENTS.md`, or make it a copy — prefer the pointer)
- `docs/guide/index.md`
- `docs/guide/why-unplugin.md`, `docs/.vitepress/config.ts` (sidebar entry only)
- `plans/README.md`

**Out of scope**:
- Any `src/` change — if the docs audit above turns out to be wrong about the code (e.g. Bun does forward watch files), fix the *doc text* to match the code and say so in the report; never change the code to match the doc.
- `README.md` (repo root) — already short and correct; add a one-line "Contributing: see AGENTS.md" only.
- `docs/showcase/*`, `docs/.vitepress/data/*`.
- Deprecation policy for `loadInclude`/`transformInclude` — direction item; don't invent a timeline.

## Git workflow

- Branch: `docs/agents-guide-and-table-fixes`
- Commits: `docs: add contributor guide with the adapter parity checklist`, `docs: align supported tables and examples with the code`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write `AGENTS.md`

Sections, in order, ≤ 120 lines total:

1. **What this repo is** (2 sentences) and the one rule: *one plugin definition must behave the same on every adapter*.
2. **Setup & verification** — exact commands: `pnpm install`, `pnpm build`, `pnpm test` (full), `pnpm test:unit` (after build), `pnpm test:build <fixture> [<bundler>]`, `pnpm vitest run test/unit-tests/<topic>`, `pnpm lint`, `pnpm typecheck`. State the build-first rule and why (dev loader paths point at `dist/`; rebuild after editing `src/{webpack,rspack}/loaders/*`). Mention Bun tests only run under Bun (`bun -b vitest run --allowOnly`).
3. **Layout** — one line per directory: `src/<bundler>/`, `src/utils/`, `src/types.ts`, `test/unit-tests/<topic>/`, `test/fixtures/`, `docs/`.
4. **Adapter parity checklist** — the pairs listed in Current state, as a checklist: "If you change X, also check Y"; "a fix that touches only one of a pair needs a reason in the PR"; "new hook behaviour gets an `it('<bundler>', …)` in the relevant `test/unit-tests/<topic>` suite for *every* adapter that supports it, and a table update in `docs/guide/index.md`".
5. **Conventions** — Conventional Commits with examples from `git log`; `@antfu/eslint-config` (`pnpm lint --fix`); comments explain why; no `as any` without a why-comment; prefer the shared helpers in `src/utils/`.
6. **Releases** — `pnpm release` is human-only.
7. **Plans** — "Advisor plans live in `plans/`; read `plans/README.md` before starting one."

Create `CONTRIBUTING.md` containing a heading and one sentence linking to `AGENTS.md`. Add to root `README.md` under the Documentations section: `Contributing: see [AGENTS.md](./AGENTS.md).`

**Verify**: `pnpm lint` → exit 0 (markdown formatted). `wc -l AGENTS.md` → ≤ 120.

### Step 2: Fix `docs/guide/index.md` facts

Apply every bullet in "Doc lines to fix". For each table edit, re-open the referenced `src/` line to confirm the cell before writing it.

**Verify**: `grep -n "defineUnplugin\|18.12.0\|unplugin-turbo-console" docs/guide/index.md` → nothing. `grep -c "Unloader" docs/guide/index.md` → ≥ 5 (supports list, hooks table, context table, nested table, create list, plus the existing versions table). `pnpm lint` → exit 0.

### Step 3: `why-unplugin.md`

Write the page (≤ 150 words, three paragraphs as described) and add it to the guide sidebar in `docs/.vitepress/config.ts` next to the existing guide entries. Keep the `lastUpdated: false` frontmatter (the other guide pages use it).

**Verify**: `grep -n "TODO" docs/guide/why-unplugin.md` → nothing; `grep -n "why-unplugin" docs/.vitepress/config.ts` → a sidebar entry.

### Step 4: Build the docs

**Verify**: `pnpm build && pnpm docs:build` → exit 0 (twoslash blocks compile, including the edited `createUnplugin` example). `pnpm lint` → exit 0.

## Test plan

Docs-only; verification is `pnpm lint` and `pnpm docs:build`. Optionally preview with `pnpm docs:dev --host 0.0.0.0` and eyeball the three tables for column alignment.

## Done criteria

- [ ] `AGENTS.md` and `CONTRIBUTING.md` exist at the repo root; `AGENTS.md` contains the strings `pnpm build`, `test/unit-tests`, `webpack`, `rspack`, `esbuild`, `bun`, `parity`
- [ ] `grep -n "defineUnplugin\|18.12.0\|unplugin-turbo-console" docs/guide/index.md` → nothing
- [ ] `grep -n "getNativeBuildContext" docs/guide/index.md` → a table row
- [ ] `grep -n "TODO" docs/guide/why-unplugin.md` → nothing
- [ ] `pnpm lint` exits 0; `pnpm docs:build` exits 0
- [ ] No `src/` files modified; `plans/README.md` updated

## STOP conditions

- `AGENTS.md`/`CONTRIBUTING.md` already exist with substantive content (merge instead of overwrite — report first).
- A table cell you're about to change contradicts what you find in `src/` *and* what this plan says (both can't be right) — report the three-way disagreement.
- `pnpm docs:build` fails inside an edited twoslash block and you can't make `createUnplugin` type-check in the example without changing its meaning.

## Maintenance notes

- `AGENTS.md` should be updated whenever a plan in `plans/` changes the verification commands (e.g. plan 001's `test:unit`).
- The `loadInclude`/`transformInclude` rows remain struck-through ✅ everywhere; when a deprecation timeline is decided (direction item), add it to footnote 2.
- Reviewers: the Bun `addWatchFile` flip (✅ → ❌) is a doc *correction*, not a behaviour change; if maintainers would rather implement forwarding, that becomes a `src/bun` plan.
