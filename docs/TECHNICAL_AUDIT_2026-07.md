# Misfits Cavern — Technical Audit (July 2026)

Analysis-only audit. No code was modified. Every claim cites a file (and line where useful); anything unverifiable is labeled as such.

Context that shaped this audit: the repo already completed a prior hardening pass (documented in `.cavern-intelligence/STATE.md`) — CI pipeline, vitest harness, cookie-backed auth with validating middleware, Discord route auth, generated Supabase types. This audit therefore focuses on **what remains**, not on re-litigating fixed issues.

---

## 1. Executive Summary

**Overall health grade: B.** For a solo/small-team indie product, this codebase is in unusually good shape: real CI gates (typecheck, lint, unit tests, build, e2e smoke), RLS-first security enforced in the database, server-validated sessions in middleware, generated DB types, and honest internal documentation that matches the code. What holds it back from an A is concentrated in three places: TypeScript strict mode is off (so the type system silently permits ~250 `any`-typed escape hatches across the data layer), the two flagship pages are 2,100–3,000-line god files that make every future change riskier, and the pinned Next.js 14.2.x carries 4 high-severity advisories with no non-breaking fix.

**Top 3 risks:**
1. `next@14.x` has 4 high-severity advisories (image-optimization DoS, RSC cache poisoning, SSRF via WebSocket upgrade); the only npm-audit fix is a breaking major upgrade.
2. `"strict": false` (`tsconfig.json:16`) means null/undefined bugs and schema drift can pass CI's typecheck — the exact class of bug the third audit pass in STATE.md caught by hand.
3. `app/studio/page.tsx` (2,989 lines, 84 `useState`, 44 direct DB call sites) and `app/editor/page.tsx` (2,126 lines) are change-amplifiers: any feature touching Studio risks regressing unrelated Studio features, and they're effectively untestable as units.

**Top 3 opportunities:**
1. Turn on `strict` incrementally — the generated `database.types.ts` already exists, so most of the payoff is unlocked by just flipping flags and fixing fallout module-by-module.
2. Split the Studio/Editor pages along their existing tab/view seams (the editor already started this: `components/editor/EditorCenterViews.tsx`, `EditorSidePanels.tsx` prove the pattern works).
3. Seeded-persona e2e in CI — the Sam/Jordan/Riley persona model is well designed but the authed journeys never run in CI (`.github/workflows/ci.yml:40` runs only the two unauthenticated specs), so the RLS guarantees the product is built on are verified manually, not continuously.

---

## 2. Repo Map

**Purpose:** "Misfits Cavern" — a production suite for indie filmmakers: screenplay editor (ScriptOS), pre-production planning (Studio), Discord-like chat/voice (Lounge), plus projects hub, jobs board, crew directory, portfolios. Live at misfits-cavern-b.vercel.app. Maturity: deployed production app, single-maintainer, heavily AI-agent-developed (AGENTS.md / CLAUDE.md / `.cavern-intelligence/` knowledge hub).

**Stack:** Next.js 14 App Router (client-heavy — nearly every page is `'use client'`), TypeScript (non-strict), Tailwind, framer-motion, Supabase (Postgres + RLS + Auth + Realtime + Storage), WebRTC voice, Vercel deploys, Playwright + Vitest, GitHub Actions CI.

**Architecture sketch:** Browser client (`lib/supabase/client.ts`, cookie-backed) talks directly to Supabase under RLS; there is almost no server-side API surface — just 3 route handlers (`app/api/discord/notify`, `app/api/discord/test`, `app/api/references/search`). Authorization lives in Postgres (SECURITY DEFINER helpers `is_project_member`, `can_view_channel`, etc. in `supabase-schema.sql`; 61 policies, 29 tables with RLS). `middleware.ts` validates sessions via `getUser()` and gates `/admin` on server-verified `is_admin`. Realtime carries chat, co-editing, presence, and WebRTC signaling.

**Key directories:**

| Path | What it is |
|---|---|
| `app/` | App Router pages; the big ones (studio, editor, lounge, projects/[id]) are monolithic client components |
| `lib/supabase/` | Data layer — one module per domain (projects, channels, messages, studio…), pattern: `throw error` up, caller toasts |
| `lib/scriptos/` | Editor engine: fountain parser, exports (PDF/FDX), revisions, sync, 1st-AD scheduler — the most library-like, testable code |
| `lib/permissions/` | Client-side role/access matrix (UX gating only; real enforcement is RLS) — has unit tests |
| `lib/webrtc/` | Voice mesh over Supabase Realtime signaling |
| `components/` | Shared UI; `components/editor/` shows the extraction pattern the big pages need |
| `e2e/`, `*.test.ts` | 5 Playwright specs (551 lines), 2 vitest files (parser, access-matrix) |
| `.cavern-intelligence/` | Agent knowledge hub — accurate and current (STATE.md matches git history) |
| `supabase-schema.sql` + 2 migration files | DB/RLS source of truth (mirror of live migrations) |

**Surprises:**
- `tsconfig.tsbuildinfo` (362 KB) and `scratch_chrome_audit_prompt.md` (33 KB scratch file) are committed at the repo root.
- `app/l/` and `app/st/` are empty directories under the routes tree.
- `pg` sits in devDependencies (`package.json:44`) with no importer found in `scripts/` — likely leftover (fact: no `require('pg')` in tracked source; judgment: dead dependency).
- Docs are unusually honest — STATE.md records a real production outage and its fix.

---

## 3. Audit Report

Severity key: **C**ritical / **H**igh / **M**edium / **L**ow. Each finding marked (fact) or (judgment).

### Security

- **S1 (High, fact):** `npm audit` reports 5 advisories: 4 high in `next` 14.2.x (image-optimization DoS GHSA-h64f-5h5j-jqjh, SSRF via WebSocket upgrade GHSA-c4j6-fc7j-m34r, RSC cache poisoning GHSA-wfc6-r584-vfw7, middleware bypass GHSA-36qx-fr4f-26g5) + 1 moderate in next's bundled `postcss`. The middleware-bypass one targets Pages Router i18n (not used here — lower practical risk), but the image DoS is directly relevant since `next/image` remote patterns are configured (`next.config.js:5-17`). Only fix npm offers is `next@16` (breaking). Consequence: known DoS/SSRF vectors on a public production deployment.
- **S2 (Medium, fact):** `app/api/discord/test/route.ts` has **no authentication and no rate limit** (contrast `notify/route.ts:18-25`, which has both). Any anonymous visitor can make the server issue GETs to attacker-chosen `discord.com/api/webhooks/...` URLs at unlimited rate. The URL regex (`test/route.ts:16`) anchors the host so it's not general SSRF, but it is a free anonymous amplification/probing endpoint.
- **S3 (Medium, fact):** the rate limiter is a per-instance in-memory `Map` (`lib/api-rate-limit.ts:13`) — on Vercel serverless, every cold start / concurrent instance gets its own empty map, so the "30 req/60s" limit on `/api/discord/notify` is largely decorative under real load. The file's own comment admits this (`lib/api-rate-limit.ts:5`).
- **S4 (Low, fact):** `lib/supabase/client.ts:4-9` falls back to placeholder credentials with only a `console.warn` when env vars are missing — intended for build time, but a misconfigured deploy would ship a silently broken client rather than failing fast.
- **Healthy:** no hardcoded secrets found (grep across `app/ lib/ components/ scripts/` — only `process.env` references); service-role key is server-only and documented (`.env.example:4-7`); `notify` route derives identity from a verified JWT and re-checks channel visibility as the user, not as admin (`app/api/discord/notify/route.ts:28-77`) — this is a genuinely well-designed route; middleware validates sessions with `getUser()` and gates `/admin` server-side (`middleware.ts:41-90`); no `dangerouslySetInnerHTML`/`innerHTML` anywhere; RLS coverage is broad (29 `ENABLE ROW LEVEL SECURITY`, 61 policies) — *live* policy correctness was not re-verified in this audit (would need DB access; STATE.md records it was verified 2026-Q2).

### Type safety & code quality

- **Q1 (High, fact):** `"strict": false` — `tsconfig.json:16`. Combined with 189 `: any` and 67 `as any` occurrences in app/lib/components (e.g. `lib/supabase/projects.ts:15-16` `settings?: any; festival_submissions?: any[]`; `lib/supabase/audit.ts` with 6 `any`s), the typecheck CI gate cannot catch null-deref or shape-drift bugs. This matters concretely: STATE.md's "third pass" found 8+ production defects that strict typing against the generated `Database` types would have caught at compile time.
- **Q2 (High, fact + judgment):** god files. `app/studio/page.tsx` — 2,989 lines, 84 `useState` hooks, 44 `supabase`/data-layer call sites, ~40 imports (fact). `app/editor/page.tsx` — 2,126 lines, 61 `useState`. `app/projects/[id]/page.tsx` — 1,156; `app/lounge/page.tsx` — 1,139. Judgment: at this size every state interaction is global to the page; regressions in one tab from edits to another are likely, and unit testing is impossible. The editor has already begun extraction (`components/editor/*`), Studio has not.
- **Q3 (Medium, fact):** hand-written interfaces duplicate the generated DB types — e.g. `DBProject` in `lib/supabase/projects.ts:5-19` re-declares what `lib/supabase/database.types.ts` already generates, and its `settings/festival_submissions` are `any`. Two sources of truth for row shapes reintroduces exactly the schema drift the type generation was added to kill.
- **Q4 (Low, fact):** repo hygiene — `tsconfig.tsbuildinfo` (362 KB build artifact) and `scratch_chrome_audit_prompt.md` (33 KB prompt scratch) are committed and churn in history (commit 25a0679 "update chrome audit prompt and rebuild tsbuildinfo"); empty route dirs `app/l/`, `app/st/`; `pg` in devDependencies with no usage found.
- **Healthy:** error-handling convention is consistent and deliberate — data layer `throw error` (72 throws in `lib/supabase/`), UI toasts; only 15 empty `catch {}` blocks repo-wide, and sampled ones are intentional best-effort paths with comments (`lib/supabase/projects.ts:37-43`). `withTimeout` guard (`lib/supabase/withTimeout.ts`) is a nice touch. Naming and module boundaries in `lib/` are clean and cohesive.

### Testing

- **T1 (High, fact):** unit coverage is 2 files / 36 tests (`lib/scriptos/parser.test.ts`, `lib/permissions/access-matrix.test.ts`). Zero tests for the rest of `lib/scriptos/` — `schedule.ts` (the 1st-AD auto-scheduler, a flagship algorithm), `export.ts`/`export-pro.ts`/`fountain-export.ts` (data-loss surface), `revisions.ts`, `sync.ts` (conflict handling), `import.ts`/`pdfImport.ts`. These are pure-ish library modules — the most testable code in the repo is the least tested.
- **T2 (High, fact):** CI runs only unauthenticated e2e (`.github/workflows/ci.yml:40` — the workflow's own comment says authed journeys need a seeded test user). The Sam/Jordan/Riley persona guarantees — including "Riley must see nothing project-scoped (P0 if leaked)" (AGENTS.md) — are not continuously verified. `scripts/test-anon-rls.js` exists but isn't wired into CI.
- **T3 (Low, judgment):** several e2e assertions verify execution more than behavior — e.g. `e2e/sam-journey-smoke.spec.ts:21-23` asserts body text length > 50 chars. Fine for crash-smoke; don't mistake it for coverage.

### Architecture & performance

- **A1 (Medium, judgment, calibrated):** nearly everything is client-rendered with direct Supabase calls; the App Router is used as a client-SPA host. For this team size that's a reasonable choice (RLS makes the client-direct model safe), and I do **not** recommend a server-component rewrite. The cost to acknowledge: initial-load payloads are large (three.js, tsparticles, recharts, pdfjs, jspdf all in the client bundle per `package.json`), and no bundle-size budget exists. Unverified: actual route-level bundle sizes (needs a build with analyzer).
- **A2 (Medium, fact):** heavy libraries — `three` + `@react-three/*` power `components/3D/OrbitGallery.tsx`, `tsparticles` powers `ParticleBackground.tsx` which is imported on major pages (`app/studio/page.tsx:11`). Whether they're lazy-loaded per route was not fully verified; if statically imported, they inflate first paint on every page that mounts them.
- **A3 (Low, fact):** `getUserProjects` ignores its `_userId` param and relies on RLS scoping (`lib/supabase/projects.ts:49-58`) — correct, but the vestigial param invites misuse. Minor.
- **Healthy:** the schema comments and README claim indexed FKs and InitPlan-optimized `auth.uid()` subqueries; the SQL in `supabase-schema.sql` is consistent with that claim. No N+1 patterns found in sampled data-layer modules (queries are single-shot selects with joins via PostgREST).

### Dependencies

- **D1 (High):** = S1 (Next.js advisories). Also `eslint@8` is EOL (fact: `package.json:41`); migration to eslint 9 flat config will be forced by the next tooling bump.
- **D2 (Low, fact):** lockfile is present and consistent; licenses in the dependency set are permissive (MIT/Apache — spot-checked, not exhaustively verified). `pg` appears unused (Q4).

### DevEx, operations, documentation

- **O1 (Medium, fact):** no error reporting/observability — errors go to `console.error` (86 occurrences) and `removeConsole` strips them in production builds (`next.config.js:20`), so production client errors vanish entirely. There is no Sentry/logging sink. For a live product with real users, you are blind to client-side failures.
- **O2 (Low, fact):** lint config is minimal (`.eslintrc.json` = `next/core-web-vitals` only) — no import-order, no `no-explicit-any` even as warn. CI does enforce it, which is the important part.
- **Healthy (one sentence each):** CI is real and ordered correctly (typecheck → lint → test → build → e2e smoke, `.github/workflows/ci.yml`); README is accurate and matches the code (verified stack, env vars, commands, repo map); onboarding is `npm install && cp .env.example .env.local && npm run dev` and it's documented; `.cavern-intelligence/` docs match git history rather than contradicting it — rare and valuable.

### Strengths (what to preserve)

1. **RLS-first security model** with SECURITY DEFINER helpers and no client-side trust — the architecture's backbone, and it's sound.
2. **`/api/discord/notify`** is a model route: JWT-verified identity, user-scoped authz re-check, service-role reads isolated, secrets never echoed.
3. **CI with hard gates** on typecheck/lint/test/build — most solo projects have none.
4. **Consistent conventions**: one toast system, one confirm system, throw-up-toast-at-UI error flow, documented in AGENTS.md and actually followed.
5. **Self-documenting culture**: STATE.md is a truthful changelog including a production outage post-mortem.
6. **Generated DB types already in place** — the hard part of the strict-mode migration is done.

---

## 4. Improvement Strategy

### Theme 1 — The type system is present but disarmed
Findings Q1, Q3. **Target state:** `strict: true` (or at minimum `strictNullChecks` + `noImplicitAny`), hand-written row interfaces replaced by `Database['public']['Tables'][...]['Row']` aliases, `no-explicit-any` as a lint warning. **Principle:** the repo's own history proves schema drift is its dominant bug class; strict typing converts that class from "found in production by manual audit" to "found in CI."

### Theme 2 — Two pages carry half the product's risk
Findings Q2, T1. **Target state:** Studio and Editor pages become thin route shells composing per-tab/per-panel components with local state, following the pattern already established in `components/editor/`. Pure logic (scheduler, exports, sync/merge) lives in `lib/` with unit tests. **Principle:** shrink the blast radius of change; make the flagship features testable.

### Theme 3 — The security model is enforced but not continuously verified
Findings T2, S2, S3. **Target state:** a seeded test project + three persona users in a Supabase test environment; the persona e2e suite (especially Riley-sees-nothing) runs in CI; every API route has auth + rate limiting appropriate to its exposure. **Principle:** "Verify, Don't Claim" (AGENTS.md's own rule) applied to the thing that matters most.

### Theme 4 — Known-vulnerable platform pin
Finding S1/D1. **Target state:** either a patched Next 14.2.x (if Vercel backports; verify against advisories) or a planned Next 15/16 migration. **Principle:** a public app shouldn't sit on unpatched high-severity DoS/SSRF advisories.

### Explicitly NOT recommending
- **Server-component / RSC rewrite** — the client-direct + RLS model is safe and fits the team size; the rewrite cost dwarfs the payoff (A1).
- **Distributed rate limiting (Upstash/Redis)** — for current traffic, tightening the existing limiter + adding auth to `/api/discord/test` is enough; revisit only if abuse is observed (S3 mitigated, not eliminated).
- **80%+ global coverage targets** — test the pure `lib/scriptos/` logic and the persona security boundary; chasing coverage in 3,000-line UI files before splitting them is wasted effort.
- **Enterprise observability stack** — one lightweight error sink (e.g. Sentry free tier) is the right size, not OTel pipelines.

### Definition of done (measurable)
- CI typecheck passes with `strict: true`; `as any`/`: any` count < 30 repo-wide.
- No source page file > 800 lines.
- CI runs Riley/Jordan/Sam persona e2e against a seeded environment; a Riley data-leak fails the build.
- `npm audit` shows zero high-severity advisories.
- All 3 API routes have auth (where appropriate) + rate limiting.
- Production client errors reach an error sink (verifiable by a test event).

---

## 5. Task Plan

### Quick wins (do immediately, all S)

| # | Task | Why |
|---|---|---|
| QW1 | Delete `tsconfig.tsbuildinfo` + `scratch_chrome_audit_prompt.md` from git, add `*.tsbuildinfo` to `.gitignore`; remove empty `app/l/`, `app/st/`; drop unused `pg` devDep | Q4 — repo hygiene, smaller diffs/clones |
| QW2 | Add auth (Bearer token, same pattern as notify) + `checkRateLimit` to `app/api/discord/test/route.ts` | S2 — closes anonymous probe endpoint |
| QW3 | Fail fast in `lib/supabase/client.ts` when env vars are missing at runtime (keep placeholder only under `process.env.NODE_ENV === 'production' && typeof window === 'undefined'` build context) | S4 |
| QW4 | Add `@typescript-eslint/no-explicit-any: warn` and wire `scripts/test-anon-rls.js` into CI as a non-blocking step | O2, T2 stepping stone |

### Milestone 0 — Safety net

| ID | Task | Files | Acceptance | Effort | Risk | Deps |
|---|---|---|---|---|---|---|
| M0.1 | **Unit tests for scriptos core logic**: `schedule.ts`, `export.ts`/`fountain-export.ts` (round-trip: parse → export → parse equals input), `revisions.ts`, `sync.ts` merge/conflict paths | `lib/scriptos/*.test.ts` | ≥40 new tests, green in CI; round-trip property holds on 3 sample scripts | L | None (test-only) | — |
| M0.2 | **Seeded persona test environment**: Supabase test project (or branch) with Sam/Jordan/Riley users + one seeded project; store creds as CI secrets | `e2e/helpers.ts`, CI secrets, seed script in `scripts/` | `e2e/sam-journey-smoke.spec.ts` full suite + a new `riley-isolation.spec.ts` pass locally against seed | L | Low | — |
| M0.3 | **Persona e2e in CI**: add authed Playwright job; a Riley-visible project row fails the build | `.github/workflows/ci.yml`, `e2e/` | CI red on injected leak (verify once by temporarily loosening a policy in the test env) | M | Low | M0.2 |

### Milestone 1 — Critical fixes (security/correctness)

| ID | Task | Files | Acceptance | Effort | Risk | Deps |
|---|---|---|---|---|---|---|
| M1.1 | **Next.js advisory remediation**: check for patched 14.2.x covering the 4 GHSAs; if none, upgrade to Next 15 (App-Router codemod path) | `package.json`, `next.config.js`, potentially async `params`/`cookies` call sites | `npm audit` zero high; full CI green; manual smoke of editor/lounge/studio | XL (breakdown: audit advisories → try minor bump → Next 15 codemod → fix async-API fallout → e2e) | Medium-high (framework upgrade) | M0.1–M0.3 (safety net first) |
| M1.2 | QW2 (test-route auth) if not already done | `app/api/discord/test/route.ts` | Unauth request → 401; >limit → 429 | S | None | — |
| M1.3 | **Error sink**: add Sentry (or equivalent) client+server init; stop relying on stripped `console.error` | `app/layout.tsx`, `next.config.js`, new `lib/monitoring.ts` | A thrown test error appears in the dashboard from a production build | S | Low | — |

### Milestone 2 — High-leverage improvements

| ID | Task | Files | Acceptance | Effort | Risk | Deps |
|---|---|---|---|---|---|---|
| M2.1 | **Enable `strictNullChecks` + `noImplicitAny`**, fix fallout module-by-module (`lib/` first, then `components/`, then `app/`) | `tsconfig.json`, ~everything | `tsc --noEmit` green with flags on; CI enforces | XL (breakdown per directory) | Low-medium (compile-time only, but touch count is high) | M0.1 |
| M2.2 | **Replace hand-written row types with generated types**: `DBProject` et al become aliases of `Database[...]['Row']` | `lib/supabase/*.ts` | No interface in `lib/supabase/` redeclares a table shape; `settings: any` gone | M | Low | M2.1 helps but not required |
| M2.3 | **Split `app/studio/page.tsx`** along its stage/tab seams into `components/studio/*` (mirror the `components/editor/` pattern); page becomes a shell < 400 lines | `app/studio/page.tsx` → `components/studio/*` | Page < 400 lines; each extracted component < 600; e2e studio spec green | XL (one tab at a time; each tab is an M) | Medium (state untangling) | M0.3 (e2e coverage first) |
| M2.4 | **Split `app/editor/page.tsx`** — finish the extraction already started | `app/editor/page.tsx`, `components/editor/*` | Page < 800 lines; e2e green | L | Medium | M0.1, M0.3 |

### Milestone 3 — Quality & polish

| ID | Task | Files | Acceptance | Effort | Risk | Deps |
|---|---|---|---|---|---|---|
| M3.1 | Lazy-load heavy visuals: dynamic-import `OrbitGallery` (three.js), `ParticleBackground` (tsparticles), pdf/export libs at call sites; add a bundle-analyzer CI report | `components/3D/`, `components/ParticleBackground.tsx`, `lib/scriptos/pdfGenerator.ts` | First-load JS for `/studio` and `/` drops measurably (record before/after) | M | Low | — |
| M3.2 | Full `strict: true` (remaining flags) + `as any` burn-down to < 30 | `tsconfig.json` | CI green with `strict: true` | M | Low | M2.1 |
| M3.3 | ESLint 9 flat-config migration; add import-order rule | `.eslintrc.json` → `eslint.config.js` | `npm run lint` green | S | Low | — |
| M3.4 | Remove vestigial params/dead code (`getUserProjects(_userId)`, unused `pg`) | `lib/supabase/projects.ts` | Callers updated; typecheck green | S | None | — |

### Implementation sketches (top 3)

**M1.1 — Next.js upgrade.** First check whether any 14.2.x > 14.2.35 patches the four GHSAs (npm audit suggested only 16, but audit's resolver often overshoots — read each advisory's patched-versions range). If a 14.x patch exists, take it and stop. Otherwise go to Next 15 (not 16 in one hop): run `npx @next/codemod@latest upgrade`, expect fallout in (a) async request APIs — `cookies()`/`headers()` become async, which touches `middleware.ts` patterns and any server code; (b) `params` becoming a Promise in `app/*/[id]/page.tsx` — though these are client pages using `useParams`, so likely unaffected; (c) fetch-caching default changes — irrelevant here since data flows through Supabase client. Gotcha: `@supabase/ssr` middleware cookie dance (`middleware.ts:37-56`) is version-sensitive — retest the sign-in redirect loop that was previously fixed (commit 9e68493) as the #1 regression check. Land only with M0 e2e green.

**M2.1 — strictNullChecks rollout.** Flip flags on, run `tsc --noEmit`, bucket errors by directory. Fix `lib/supabase/` first (highest value: Supabase responses are `T | null` and non-strict code ignores it — exactly the blank-page failure class from STATE.md's third pass). Use targeted `// @ts-expect-error TODO(strict)` for genuinely hard cases rather than `as any`, then burn them down; grep-able marker makes progress measurable. Do NOT fix by sprinkling `!` — prefer early returns + toast, matching the existing error convention. Land per-directory PRs to keep review sane.

**M0.2/M0.3 — persona CI.** Create a dedicated Supabase project (or use branching) seeded by a `scripts/seed-personas.ts` run with the service-role key: 3 users via `auth.admin.createUser`, one project owned by Sam with Jordan as confirmed crew, one private channel. e2e logs in via the real `/auth` form (session cookies then flow through middleware naturally). The Riley spec asserts: `/projects` shows zero of Sam's projects, direct navigation to `projects/[id]` yields not-found/redirect, and a raw PostgREST fetch with Riley's JWT returns 0 rows (belt-and-braces, reusing `scripts/test-anon-rls.js` logic). Gotcha: keep the seed idempotent (delete-and-recreate by fixed emails) so CI reruns don't accumulate state.

---

## 6. Open Questions

1. **Next.js strategy:** is a framework major upgrade acceptable now, or should we wait for a specific milestone? (Determines M1.1 timing; the advisories argue for "soon.")
2. **Traffic reality:** current MAU/request volume — does the in-memory rate limiter's weakness (S3) matter yet, or is deferring Redis correct?
3. **Test environment budget:** is a second Supabase project (or paid branching) available for persona CI? Free-tier constraints may shape M0.2.
4. **`pg` devDependency and empty `app/l`/`app/st` dirs:** intentional placeholders or safe to delete? (Assumed deletable in QW1 — confirm.)
5. **Error-sink preference:** Sentry vs. Vercel-native monitoring vs. self-hosted — any privacy constraints for user content in error payloads (scripts are users' IP)?
6. **Areas receiving lighter review** (flagging per audit rules): live RLS policy correctness (no DB access used), `lib/webrtc/voice.ts`, the full 2,784-line generated types file, `components/` visual layer, and actual bundle sizes (needs an instrumented build).
