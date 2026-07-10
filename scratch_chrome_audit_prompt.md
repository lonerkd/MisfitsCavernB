# Misfits Cavern — Technical Audit

## Executive Summary

**Overall Health: C+**

Misfits Cavern is an ambitious indie-filmmaker production suite — a single Next.js 14 application spanning screenplay editing (ScriptOS), project/crew management (Studio), real-time chat/lounge (Lounge), portfolio/pitch, soundtrack, and admin tools. It has genuine architectural strengths: a clean `lib/` module boundary strategy, a well-documented RLs/permissions layer, and a functional build pipeline with zero TypeScript or compiler errors. However, the codebase has significant structural debt from rapid feature delivery:

- **Six monolithic pages** (2,831 lines in `studio/page.tsx`, 1,970 in `editor/page.tsx`) couple rendering, state, API calls, and sub-components into single files, making every change risky and slow.
- **Zero unit tests** — the only tests are 4 Playwright e2e specs. Core business logic (screenplay parser, budget engine, scheduling) has no test coverage at all.
- **`strict: false`** in `tsconfig.json` and `Database: any` in the Supabase client bypass the entire TypeScript safety system for database operations.
- **34 files contain lines exceeding 200 characters**, the worst at 591 chars (`crew/page.tsx:378`), indicating systematic inattention to line-length hygiene.

**Top 3 Risks:**
1. **Monolithic pages hide data-loss bugs** — the screenplay parser (`lib/scriptos/parser.ts`, 610 lines), budget engine, and auto-save are entirely untested; a regression in any of these destroys user work silently.
2. **`strict: false` + `Database: any`** means the compiler catches zero SQL/row-shape mismatches — every Supabase query is effectively unchecked TypeScript.
3. **No CI pipeline** beyond Vercel's auto-deploy (which has no test gate) — broken code reaches production if the build compiles.

**Top 3 Opportunities:**
1. Extracting the six largest pages into feature-internal modules would immediately reduce cognitive load and enable independent testing.
2. Generating Supabase types (`supabase gen types`) would eliminate an entire class of runtime errors at zero maintenance cost.
3. Adding `strict: true` (or the targeted `--strict` flags) would catch ~30–50 latent type issues with minimal line changes.

---

## Repo Map

### Purpose
A browser-based production suite for indie filmmakers. Covers the full filmmaking lifecycle: scriptwriting (ScriptOS), pre-production planning (Studio), team communication (Lounge), portfolio/pitch presentation, crew hiring (Jobs), and soundtrack management.

### Stack
- **Framework:** Next.js 14 App Router (`'use client'` throughout)
- **Language:** TypeScript 5.9 (with `strict: false`)
- **Styling:** Tailwind CSS 3.4 + `tailwind-merge` + custom CSS (`app/globals.css`, 22 KB)
- **Animation:** framer-motion 12.x + Three.js/React Three Fiber
- **Database:** Supabase (Postgres + RLS + Realtime + Storage)
- **Auth:** Supabase Auth (cookie-based SSR via `@supabase/ssr`)
- **Real-time:** Supabase Realtime (channels, presence) + WebRTC (voice)
- **Testing:** Playwright (4 e2e specs only)
- **CI/CD:** Vercel auto-deploy from `main` (no GitHub Actions workflows)
- **External integrations:** Spotify OAuth, Discord webhook, HIBP k-anonymity

### Architecture Sketch

```
app/ (Next.js pages, 28 route groups)
├── page.tsx — Home/dashboard (839 lines)
├── editor/ — ScriptOS screenwriting (1,970 lines)
├── studio/ — Production management (2,831 lines)
├── lounge/ — Team chat (1,068 lines)
├── projects/[id]/ — Project hub (1,151 lines)
├── projects/[id]/pitch/ — Pitch board
├── jobs/ + crew/ + portfolio/
├── settings/ + profile/ + soundtrack/
├── p/[token]/ — Public portfolio share
├── admin/ — RBAC admin (users, analytics, audit logs)
├── auth/ — Sign-in/sign-up flows
└── api/ — Route handlers (discord, references)

lib/ (70+ modules)
├── context/ — React contexts (Auth, Project, Pill, Presence, Spotify)
├── supabase/ — Data-access layer (18 files: projects, scripts, jobs, etc.)
├── scriptos/ — Screenplay engine (22 files: parser, validator, export, sync)
├── permissions/ — RBAC (access-matrix, roles, usePermissions)
├── webrtc/ — Voice chat
├── spotify/ — Spotify integration
├── hooks/ — Custom React hooks
├── storage/, references/, animations/
└── middleware (auth, rate limiting)

components/ (30+ components)
├── editor/ — Editor sub-components (panels, nav, modals)
├── ui/ — Shared primitives (Button, Input, Textarea)
├── canvas/ — Pannable canvas + pins
├── 3D/ — Three.js gallery
└── Top-level: Taskbar, CommandPalette, Toast, Confirm, Avatar, etc.
```

### Data/Control Flow

```
Browser → Next.js App Router → 'use client' page components
  → lib/context/ProjectContext (global state + Supabase fetch)
  → lib/permissions/usePermissions (RLS-aware guards)
  → lib/supabase/ (data-access functions)
  → Supabase (Postgres + Realtime push)
```

### Key Directories

| Directory | Purpose | Size |
|---|---|---|
| `app/studio/` | Pre-production suite (scheduling, budget, assets, crew) | 2,831 lines |
| `app/editor/` | ScriptOS screenplay editor | 1,970 lines |
| `app/lounge/` | Team chat + voice channels | 1,068 lines |
| `app/projects/` | Project hub + pitch board | 1,774 lines (2 files) |
| `lib/scriptos/` | Screenplay parsing, formatting, validation, export | ~3,500 lines (22 files) |
| `lib/supabase/` | Data-access layer | ~2,500 lines (18 files) |
| `lib/permissions/` | RBAC matrix + guards | ~600 lines (4 files) |
| `components/editor/` | Editor UI sub-components | ~1,500 lines (7 files) |
| `e2e/` | Playwright smoke tests | 4 spec files |

### Surprises
- **`strict: false`** — for a project of this complexity, this is unusual and concerning. It means `null`/`undefined` and implicit `any` pass silently.
- **22 files in `lib/scriptos/`** — the screenplay engine is deeper than expected, with its own parser, worker, formatter, validator, export pipeline, and revision system. This is the most sophisticated module and the least tested.
- **No `TODO`/`FIXME`/`HACK` anywhere** — either the team is disciplined about cleanup or debt markers are removed before commit. Given the other evidence, likely the latter.
- **Vercel project config is committed** (`.vercel/project.json`) — unusual; most teams gitignore this.

---

## Audit Report

### Architecture & Design

**Critical**

| # | Finding | Location | Why It Matters |
|---|---|---|---|
| A1 | **Six monolithic page components** contain rendering, state, data-fetching, event handlers, and sub-component definitions | `app/studio/page.tsx:1-2831`, `app/editor/page.tsx:1-1970`, `app/lounge/page.tsx:1-1068`, `app/projects/[id]/page.tsx:1-1151`, `app/page.tsx:1-839`, `components/EcosystemTaskbar.tsx:1-898`, `app/jobs/page.tsx:1-753` | Single-file coupling means any change risks unrelated features. Impossible to unit-test in isolation. Review diffs are enormous. Refactoring one module requires understanding the entire page — blocks parallel work. |
| A2 | **No generated Supabase types** — `Database` is typed as `any` | `lib/supabase/client.ts:17` | Every Supabase query result is unchecked. A column rename, table drop, or RLS change that breaks queries is caught only at runtime — or worse, silently returns `undefined` that propagates as a cryptic UI bug. |
| A3 | **Context state in `ProjectContext` handles 8 entity types** but has no error boundary or loading isolation | `lib/context/ProjectContext.tsx:219-251` | A single failed `Promise.all` query (any of 8 parallel fetches) causes the entire project to not load. There is no partial-failure recovery or per-entity error state. Users see a blank screen if any one table is inaccessible. |

**High**

| # | Finding | Location | Why It Matters |
|---|---|---|---|
| A4 | **`'use client'` on every page** — no server components used anywhere | All `app/` page files | Forces client-side rendering for every route. Eliminates Next.js 14's biggest advantage (RSC streaming, smaller client bundles). Homepage, portfolio, and public share pages (`p/[token]`, `s/[token]`) could all be static/server-rendered. |
| A5 | **`middleware.ts` is a single 300+ line function** with no sub-functions | `middleware.ts` | Middleware runs on every request. The monolithic structure makes it hard to skip or compose auth checks per route. A bug here breaks the entire site. |
| A6 | **Multiple Supabase client patterns** — direct `supabase.from()` in pages, via `lib/supabase/*` functions, and inline in components | `app/editor/page.tsx:passim`, `app/studio/page.tsx:passim`, `lib/supabase/projects.ts` | Inconsistent data-access layer. Some code goes through the `lib/supabase/` abstraction (testable, centralized), some goes directly in pages (untestable, repeated patterns). |

**Medium**

| # | Finding | Location | Why It Matters |
|---|---|---|---|
| A7 | **`lib/scriptos/parser.ts` is 610 lines** with inline type definitions | `lib/scriptos/parser.ts` | The most logic-dense module in the app has no test coverage and mixes type definitions with parsing logic. |
| A8 | **Spotify context (`SpotifyContext`) is client-only** with no SSR fallback | `lib/context/SpotifyContext.tsx` | Users with no Spotify auth get a flash of loading state on every navigation. Could check cookie/server state before rendering. |

### Code Quality

**Critical**

| # | Finding | Location | Why It Matters |
|---|---|---|---|
| C1 | **No unit tests exist** — 0 test files found anywhere | Entire repo | Core business logic (screenplay parser, budget engine, auto-save conflict resolution, Realtime sync, RBAC matrix) has zero automated verification. Refactoring any module requires manual regression testing. |
| C2 | **`strict: false` in tsconfig.json** | `tsconfig.json:10` | `strict: false` disables `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, and more. This means: nullable values are never checked, implicit `any` flows through function boundaries, and `undefined` is a valid value everywhere. |

**High**

| # | Finding | Location | Why It Matters |
|---|---|---|---|
| C3 | **34 files with lines >200 characters** — max 591 chars | `app/crew/page.tsx:378`, `app/auth/page.tsx:325`, multiple others | Lines this long are unreadable on any screen. They contain deeply nested JSX, chained ternaries, and inline event handlers that should be extracted. |
| C4 | **Error handling inconsistency** — `ProjectContext.updateProject` uses `console.error` instead of `useToast()` | `lib/context/ProjectContext.tsx:341` | AGENTS.md mandates all feedback via `useToast()`. The user sees nothing when a save fails. Data-loss risk. |
| C5 | **Debug `console.log` left in production code** | `components/ParticleBackground.tsx:17` | Minor individually, but signals incomplete cleanup discipline. |

**Medium**

| # | Finding | Location | Why It Matters |
|---|---|---|---|
| C6 | **`env.local` fallback placeholders in client.ts** — `console.warn` for missing vars | `lib/supabase/client.ts:3-7` | Pragmatic for build, but `console.warn` reaches production. Consider a build-time check instead. |
| C7 | **`lib/webrtc/voice.ts` has useRef cleanup warning** (ESLint flagged) | `lib/webrtc/voice.ts:200` | Stale ref in effect cleanup can cause "setState on unmounted component" errors during voice channel transitions. |

### Security

**High**

| # | Finding | Location | Why It Matters |
|---|---|---|---|
| S1 | **Supabase RLS policies in `lib/supabase/` are documented but not enforced at the type level** | All `lib/supabase/*.ts` files | RLS is the only access control between a user and project-scoped data. `Database: any` means there is zero type-level verification that a query respects RLS boundaries. A missing `.eq('project_id', ...)` filter leaks data to any authenticated user. |
| S2 | **No rate-limiting on auth endpoints** | `middleware.ts`, `app/auth/page.tsx` | Rate limiting infrastructure exists in `lib/api-rate-limit.ts` but may not be wired to auth. |

**Medium**

| # | Finding | Location | Why It Matters |
|---|---|---|---|
| S3 | **Password strength check is client-only** | `lib/password-strength.ts`, app integration | HIBP k-anonymity check runs client-side. A compromised client or disabled JS bypasses the check entirely. |
| S4 | **Discord/Supabase service role keys in env only, but no key rotation policy documented** | `.env.example` | Not actionable, but worth tracking for production readiness. |

### Testing

**Critical**

| # | Finding | Location | Why It Matters |
|---|---|---|---|
| T1 | **Zero unit tests for 70+ lib/ modules** | Entire `lib/` directory | The entire data-access layer (18 supabase files), screenplay engine (22 scriptos files), RBAC system (4 files), WebRTC, Spotify integration, and utility hooks have zero tests. |
| T2 | **E2e tests target production URL only** (`https://misfits-cavern-b.vercel.app`) | `playwright.config.ts` | Tests cannot run locally or in preview deployments. No PR gates. |

**High**

| # | Finding | Location | Why It Matters |
|---|---|---|---|
| T3 | **E2e tests cover only 4 scenarios** (auth validation, home page crash, Sam journey, studio toggle) | `e2e/*.spec.ts` | Critical paths untested: screenplay creation/editing, project creation, crew invitation, budget operations, Realtime sync. |
| T4 | **No test for `lib/scriptos/parser.ts`** (610 lines, complex state machine) | `lib/scriptos/parser.ts` | The parser is the single most likely source of data-loss bugs. A regression corrupts every user's screenplay. |

### Performance

**Medium**

| # | Finding | Location | Why It Matters |
|---|---|---|---|
| P1 | **`Promise.all` on 8 parallel Supabase queries in ProjectContext** — no pagination or lazy loading | `lib/context/ProjectContext.tsx:219-251` | Every project load fetches all budget items, timeline items, crew, beats, assets, scenes, and campaigns regardless of what the current view needs. Projects with hundreds of items will be slow. |
| P2 | **All pages are `'use client'` with no RSC streaming** | All `app/` pages | Every page ships the full React bundle. Public pages (portfolio, shared script `s/[token]`) don't need client-side JS at all. |
| P3 | **No image optimization** — 20+ `<img>` tags instead of `<Image>` | Multiple files (ESLint flagged) | Slower LCP, higher bandwidth. In production, this degrades Core Web Vitals. |

**Low**

| # | Finding | Location | Why It Matters |
|---|---|---|---|
| P4 | **Three.js bundle included for showcase gallery** | `components/3D/OrbitGallery.tsx`, package.json | Three.js/fiber (~150 KB gzipped) is loaded on every page via the client bundle. Only the showcase page needs it. Dynamic import would save bandwidth across the rest of the app. |

### Dependencies

**Medium**

| # | Finding | Location | Why It Matters |
|---|---|---|---|
| D1 | **`@types/diff`** is in `dependencies` (should be `devDependencies`) | `package.json:16` | Increases production bundle size unnecessarily (though Next.js may tree-shake it). |
| D2 | **No lockfile integrity CI check** — no CI workflow at all | `.github/` (empty of workflows) | Dependencies can drift silently between developer machines. |
| D3 | **Large dependency count** — 21 runtime packages + 8 dev packages for a single-app Next.js project | `package.json` | Not excessive for the feature set, but `@tsparticles/engine`, `three`, `recharts`, and `pdfjs-dist` are heavy. Worth auditing actual usage. |

### DevEx & Operations

**High**

| # | Finding | Location | Why It Matters |
|---|---|---|---|
| X1 | **No GitHub Actions CI** — no lint, type-check, test, or build gate before Vercel deploy | `.github/` | Broken code that compiles but fails at runtime deploys to production automatically. No PR checks. |
| X2 | **ESLint has no custom rules** — only `next/core-web-vitals` | `.eslintrc.json` | Line-length, import ordering, console.* usage, and dead-code detection are all unenforced. The 34 files with >200-char lines are permanent. |
| X3 | **No Prettier or formatter config** — no `.prettierrc` found | Root directory | Code formatting is completely ad hoc. Diff noise from formatting inconsistencies makes PRs harder to review. |

**Medium**

| # | Finding | Location | Why It Matters |
|---|---|---|---|
| X4 | **`tsconfig.tsbuildinfo` committed** to git | Root directory | Build artifacts bloat the repo and cause merge conflicts. |
| X5 | **`build.log` committed** to git | Root directory | Full build output committed — includes file paths, timing info, and potentially internal project structure that shouldn't be versioned. |

### Documentation

**Medium**

| # | Finding | Location | Why It Matters |
|---|---|---|---|
| M1 | **`.env.example` is accurate and present** | `.env.example` | Good practice. No issues. |
| M2 | **README exists but the "Testing" section references unit tests that don't exist** | `README.md` | Misleading. New contributors see "unit tests with `npm test`" but there are no unit tests and no `test` script in package.json. |
| M3 | **`.cavern-intelligence/` knowledge hub is thorough** — 10 docs covering architecture, DB, design, workflows | `.cavern-intelligence/` | Excellent internal documentation. Outpaces most projects of this scale. |

---

### Strengths

1. **Comprehensive internal documentation** — The `.cavern-intelligence/` directory (10 documents) is exceptional. Architecture decisions, RLS policies, design tokens, and workflows are all written down and kept in sync.

2. **Well-structured `lib/` boundaries** — The separation into `context/`, `supabase/`, `scriptos/`, `permissions/`, and `webrtc/` creates clear module boundaries. Within each, files are named descriptively (e.g., `lib/supabase/projects.ts`, `lib/scriptos/parser.ts`).

3. **RBAC/permissions layer** — Dedicated `lib/permissions/` module with an access matrix, role definitions, and React hooks is more sophisticated than most Next.js/Supabase apps. The RLS audit script (`scripts/test-anon-rls.js`) shows security awareness.

4. **Clean build pipeline output** — `tsc --noEmit`, `npm run build`, and `npm run lint` all pass with zero errors. The app compiles cleanly.

5. **No technical-debt markers** — Zero `TODO`, `FIXME`, or `HACK` comments. The codebase doesn't have "known debt that nobody fixed."

6. **Well-documented inline comments** — `ProjectContext.tsx` has excellent comments explaining why refs are used over state, why dependency arrays are empty, and the rationale behind design decisions.

7. **E2e tests exist at all** — Many startups skip testing entirely. The 4 Playwright specs plus auth-validation tests show testing is valued, even if coverage is thin.

8. **Environment hygiene** — `.env.example` documents all required variables. The placeholder fallback in `client.ts` is a pragmatic choice for build portability.

---

## Improvement Strategy

### Theme 1: Monolithic Pages → Feature Modules

**Finding:** A6, A7, A1, C3

The six largest files (2,831, 1,970, 1,068, 1,151, 898, 839 lines) are single-page monoliths that mix data fetching, state, rendering, and event handling. This is the single highest-leverage improvement because it touches every other dimension: testability (can't test a 2,800-line file), code quality (lines >200 chars), and cognitive load.

**Target state:** Each page is a thin coordinator (imports + layout). Feature logic lives in colocated modules (e.g., `app/studio/components/SchedulePanel.tsx`, `app/studio/hooks/useSchedule.ts`). Each module is independently testable.

**Principle:** Separate fetching from rendering. Separate components from pages. If a file exceeds 300 lines, it probably should be split.

**Trade-off:** This is a large refactor. Do not attempt in one pass. Extract one panel at a time when the area needs a change. Priority order: Studio > Editor > Lounge > Taskbar.

### Theme 2: Type Safety Floor → Supabase Types + strict: true

**Finding:** A2, C2, S1

`strict: false` and `Database: any` mean the entire Supabase interaction layer is untyped. Column renames, missing `select()` fields, and RLS-violating queries are all runtime-only errors.

**Target state:** `strict: true` (or `strictNullChecks` + `noImplicitAny` + `strictFunctionTypes` minimally). `Database` is generated from the live schema via `supabase gen types`. Every Supabase query is type-checked against the actual row shape.

**Principle:** Make the compiler catch what humans miss. Types are free documentation that never goes stale.

**Trade-off:** Adding `strict: true` will initially produce 30–50 type errors. Fixing them is mechanical but tedious. Worth doing in a single dedicated pass. `supabase gen types` is zero-risk and should be done immediately.

### Theme 3: Test Coverage → Critical-Path Unit Tests

**Finding:** C1, T1, T2, T3, T4

Zero unit tests for 70+ modules of business logic is the highest-risk finding. The screenplay parser (610 lines), budget engine, RBAC matrix, and auto-save conflict resolver are entirely untested.

**Target state:** Core modules have unit tests: parser, validator, export, RBAC access-matrix, auto-save conflict resolution, Supabase data-access functions. All tests run in CI. E2e tests cover the 5 Sam-persona journeys and run against preview deployments.

**Principle:** Test behavior, not implementation. A parser test says "given this Fountain input, output matches expected AST" rather than "function was called with X argument."

**Trade-off:** Writing tests after the fact is slower than TDD. Focus on the parser (highest risk) and RBAC (security-critical) first. Defer test for UI-only components.

### Theme 4: CI/CD Pipeline → Gate Deployments

**Finding:** X1, X2, X3, T2

No CI pipeline means no lint, type-check, test, or build verification before Vercel auto-deploys. The only gate is whether `next build` succeeds.

**Target state:** GitHub Actions workflow runs `tsc --noEmit`, `npm run lint`, `npm run build`, and `npx playwright test` on every PR and push to `main`. Vercel deploys only green builds.

**Principle:** Automate what humans forget. A CI pipeline costs minutes to set up and saves hours of debugging production-only failures.

**Trade-off:** Setting up Playwright in CI requires a Vercel preview deployment URL or a local Supabase instance. The simplest path: run unit tests (which don't need Supabase) in CI, and the existing e2e tests against the production URL as a smoke check.

### Theme 5: Error Handling Uniformity

**Finding:** C4, A3, C5

Error handling is ad hoc: `console.error` in contexts, alert-like patterns in some places, `useToast()` in others. The AGENTS.md convention ("All feedback via `useToast()`") is not universally followed.

**Target state:** Every mutation path in `lib/supabase/` and `lib/context/` reports errors via `useToast()`. Every data fetch has an error state rendered in the UI (not just console). Success/failure feedback is consistent across the app.

**Principle:** The user should never have to open DevTools to know if their action succeeded.

**Trade-off:** Requires touching many files. Worth doing as a lint rule (no `console.error` in `lib/`) and fixing files as they're touched for other reasons.

### What NOT to Fix (and Why)

| Area | Reason |
|---|---|
| Three.js bundle size (P4) | Showcase is a single page. Dynamic import is easy but low impact until pageload metrics matter. |
| `lib/spotify/` code quality | Spotify integration is a peripheral feature. Fix if touched. |
| `lib/webrtc/voice.ts` ref cleanup (C7) | Low risk, low occurrence. Fix when voice features are actively developed. |
| `console.warn` in client.ts (C6) | Harmless. Production removes all console output via `next.config.js` `removeConsole`. |

### What "Done" Looks Like

- CI fails on `console.log`/`console.error` in `lib/` and `app/` (not scripts/)
- Core modules have >60% line coverage: `lib/scriptos/parser.ts`, `lib/permissions/access-matrix.ts`, `lib/scriptos/validator.ts`
- `Database` type is generated, not `any`
- `strict: true` passes with zero new errors
- Six largest page files are each split into at least 3 modules (component, hooks, data-fetching separation)
- Every mutation in `lib/supabase/*.ts` wraps errors in `useToast()`

---

## Task Plan

### Milestone 0: Safety Net (do first)

| # | Task | Files | Acceptance Criteria | Effort | Risk | Dependencies |
|---|---|---|---|---|---|---|
| M0.1 | Add GitHub Actions CI workflow | `.github/workflows/ci.yml` | PRs run `tsc --noEmit`, `npm run lint`, `npm run build`. Badges in README. | S | None | None |
| M0.2 | Add unit test for `lib/scriptos/parser.ts` | `lib/scriptos/parser.ts`, new `lib/scriptos/__tests__/parser.test.ts` | 5+ test cases covering: scene heading, action, character, dialogue, parenthetical, transition, dual dialogue, CONT'D detection. All pass in CI. | M | Low — parser is pure functions, no imports. |
| M0.3 | Add unit test for RBAC access-matrix | `lib/permissions/access-matrix.ts`, `lib/permissions/__tests__/access-matrix.test.ts` | Every role × resource × action combination is tested. Verifies Sam/Jordan/Riley personas. | S | Low | None |
| M0.4 | Add `npm test` script to package.json | `package.json` | `npm test` runs `vitest` or `jest` and exits with code 0. README updated. | S | None | M0.2, M0.3 |

**Quick wins (S effort, high impact):**
- Fix `console.log` in `ParticleBackground.tsx:17`
- Add `.prettierrc` with `{ "printWidth": 100, "singleQuote": true }`
- Gitignore `tsconfig.tsbuildinfo` and `build.log`
- Move `@types/diff` to `devDependencies`

### Milestone 1: Critical Fixes

| # | Task | Files | Acceptance Criteria | Effort | Risk | Dependencies |
|---|---|---|---|---|---|---|
| M1.1 | Generate Supabase types | `lib/supabase/client.ts`, new `lib/supabase/database.types.ts` | `Database` is the generated type. `supabase gen types` script in `package.json`. CI verifies types are up to date. | S | Low | None |
| M1.2 | Enable `strict` flags incrementally | `tsconfig.json` | Enable `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes` one at a time. Zero new TS errors after each flag. | L | Medium — each flag may produce 5–20 errors. | M0.1 (CI catches regressions) |
| M1.3 | Fix `console.error` in `ProjectContext.tsx` | `lib/context/ProjectContext.tsx` | `updateProject` shows toast on error. `fetchProjectDetails` surfaces individual query failures instead of `Promise.all` crash. | M | Medium — changing error behavior may reveal existing silent failures. |

### Milestone 2: High-Leverage Improvements

| # | Task | Files | Acceptance Criteria | Effort | Risk | Dependencies |
|---|---|---|---|---|---|---|
| M2.1 | Extract Studio page into modules | `app/studio/*` | Page is <300 lines. Modules: `SchedulingPanel`, `BudgetPanel`, `CrewPanel`, `AssetsPanel`, `CampaignPanel`, `ProjectHeader`, `useStudioQueries`. Each module has its own data-fetching hook. | XL | High — biggest refactor. Requires careful state management. | M0.2 (test coverage on extracted logic) |
| M2.2 | Extract Editor page into modules | `app/editor/*` | Page is <400 lines. Modules: `WriteView`, `OutlineView`, `RevisionsPanel`, `StudioAssetsPanel`, `useEditor`, `useScriptSave`. | L | High | M0.2 |
| M2.3 | Add ESLint rules for code quality | `.eslintrc.json` | Rules: `max-len: [warn, 120]`, `no-console: [warn, { allow: ['warn', 'error']}]`, `import/order`. CI enforces. | S | Low | M0.1 |

### Milestone 3: Quality & Polish

| # | Task | Files | Acceptance Criteria | Effort | Risk | Dependencies |
|---|---|---|---|---|---|---|
| M3.1 | Convert `<img>` to `<Image>` across app | `app/crew/page.tsx`, `app/p/[token]/page.tsx`, `app/portfolio/page.tsx`, `app/studio/page.tsx`, `app/soundtrack/page.tsx`, `components/Avatar.tsx`, `components/GlobalAudioWidget.tsx` | No `@next/next/no-img-element` lint warnings. All images use `next/image` with proper `alt` text. | L | Low | None |
| M3.2 | Fix `react-hooks/exhaustive-deps` warnings | All files with warnings (~15 files) | Zero `exhaustive-deps` warnings in CI. | M | Low — mostly mechanical additions. | None |
| M3.3 | Add test for auto-save conflict resolution | `lib/scriptos/sync.ts`, `lib/scriptos/auto-save.ts` | Tests cover: local-first save, conflict detection, remote overwrite, retry logic. | M | Low | M0.1 |
| M3.4 | Dynamic import Three.js on showcase page | `app/showcase/page.tsx`, `next.config.js` | Three.js/fiber is not included in pages other than showcase. Verified via bundle analyzer. | S | Low | None |
| M3.5 | Move e2e tests to run against preview deployments | `playwright.config.ts`, CI workflow | E2e tests run against Vercel preview URL in PR CI. | M | Low | M0.1 |

### Implementation Sketches (Top 3 Tasks)

#### M1.1 — Generate Supabase Types

```bash
# Add to package.json scripts
"gen:types": "supabase gen types typescript --linked > lib/supabase/database.types.ts"

# One-time setup
npx supabase login
npx supabase link --project-ref <project-id>
npm run gen:types

# Replace in client.ts
- export type Database = any;
+ import type { Database } from './database.types';
- export const supabase = createClient(...)
+ export const supabase = createClient<Database>(...)
```

Key gotchas: The generated type may be very large (~5,000+ lines). It's committed to the repo and regenerated on schema changes. All existing `supabase.from() .select()` calls will immediately become type-checked — expect ~20–40 new compiler errors from mismatched column references. Fix them one file at a time.

#### M2.1 — Extract Studio Page

The strategy is not "rewrite the file" but "extract one panel at a time":

1. Identify the largest visual sections in `app/studio/page.tsx` (from the 2,831 lines, roughly: Scheduling, Budget, Crew, Assets, Campaigns, Production Board, Project Header).
2. For each section, extract into `app/studio/panels/<Name>Panel.tsx`:
   - Cut the JSX from the page into the new component.
   - Extract inline state (`useState` + `useEffect`) into `app/studio/hooks/use<Name>.ts`.
   - The hook returns `{ data, loading, error, actions }`.
   - The panel component receives props from the hook or from a parent coordinator.
3. The page becomes a layout coordinator:
   ```tsx
   export default function StudioPage() {
     const { activeProject } = useProject();
     const scheduling = useScheduling(activeProject?.id);
     const budget = useBudget(activeProject?.id);
     // ...
     return <StudioLayout scheduling={scheduling} budget={budget} ... />;
   }
   ```
4. Add tests for each extracted hook (`useSchedule.test.ts`, `useBudget.test.ts`).

Risk: Shared state between panels (e.g., scheduling affects budget). If panels share mutable state, they should share a single context or coordinator hook rather than each owning a copy.

#### M1.2 — Enable Strict Mode Incrementally

1. Start with the lowest-risk flags:
   ```json
   {
     "strictNullChecks": true,
     "noImplicitAny": true,
     "strictFunctionTypes": true
   }
   ```
2. Run `npx tsc --noEmit` and fix errors:
   - `strictNullChecks` errors are mostly "value is possibly null" — add `if (x) { ... }` guards.
   - `noImplicitAny` errors are functions without parameter types — add explicit types.
   - `strictFunctionTypes` errors are rare but catch real variance bugs.
3. Only after those pass, enable the full `strict: true` (which includes the above plus `strictBindCallApply`, `noImplicitThis`, `alwaysStrict`).
4. Keep `strict: true` off in CI until all errors are fixed. Use a temporary `eslint-plugin-tsc` or a second `tsconfig-strict.json` for incremental progress.

---

## Open Questions

1. **What is the deployment target for testing?** Should e2e tests run against a staging environment (e.g., `staging` branch on Vercel) or against local Supabase? The current `playwright.config.ts` targets the production URL, which means tests against real data. A preview/staging URL with a test Supabase project would be safer.

2. **Are there plans to deprecate any features?** The `lib/spotify/` module, `components/3D/OrbitGallery.tsx`, and `app/showcase/` page feel like secondary features. If any are candidates for removal, they should be excluded from refactoring effort.

3. **What is the team size and release cadence?** The refactoring strategy differs for a solo developer vs. a 5-person team. Solo: fewer, larger PRs. Team: more, smaller PRs with stronger CI gates. The audit recommendations above assume a small team (1–3 engineers).

4. **Supabase local vs. linked?** Are developers expected to run a local Supabase instance (`supabase start`) or link to a shared dev project? This affects whether unit tests can run against a real database or need mocks.

5. **Is the `console.warn` in `client.ts` (missing env vars) intentionally reaching production?** The `next.config.js` removes console output in production via `removeConsole: process.env.NODE_ENV === 'production'`, so this may be a moot point — but worth confirming.

---

*Audit generated from repository state at HEAD `36c26b8`. All file paths and line numbers are relative to the repository root.*
