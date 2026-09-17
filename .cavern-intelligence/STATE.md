# Misfits Cavern — Project State

## Latest Session — Deterministic analysis engine (the "neural-inspired" layer)

Branch: `chore/analyze-engine`. Verified: **118 tests pass** (4 new); `next build`
green (zero warnings). Offline, no AI, no new deps.

`lib/scriptos/analyze.ts` — `analyzeScript(parseResult)` returns, with the rule
that produced each result and a confidence (explainability is the point):

- **Entity disambiguation** — ALL-CAPS action tokens resolved to
  `character` (if a cast member — "BRICK" is a person, not a prop) /
  `vehicles` / `wardrobe` / `sfx` / `vfx` / `props`, with an extra suffix vocab
  (`PICKUP`, `BLAZER`, …). Fixes the "names tagged as props" noise.
- **Continuity flags** — duplicate scene headings (warn), silent characters
  (info), scenes with no established location (info).
- **Pacing** — scene count, est. runtime, dialogue ratio, avg scene words,
  time-of-day histogram.

Exposed `KNOWLEDGE` / `BREAKDOWN_STOPWORDS` from the parser so the analyzer
reasons over the same vocabulary. `lib/scriptos/analyze.test.ts` pins
disambiguation, explanation strings, flags, and pacing.

### The on-device neural upgrade (next, opt-in)

This is the *deterministic* floor. The true "neural" step is a lazy
`transformers.js` dynamic import (runs in-browser via WebGPU/ONNX — no server,
no egress, model cached by the service worker) doing NER / zero-shot
classification behind `analyzeScript`'s interface, with the deterministic engine
as the fallback. That's a dependency + ~100–400MB opt-in model download, so it
wants its own PR with a feature flag; wired so it can never regress the offline
path. UI wiring (surface the analysis in the Studio) is also the next slice.

## Prior Session — Script→suite bridge: real breakdown elements + budget core

Branch: `chore/suite-bridge`. Verified: **114 tests pass** (4 new); `next build`
green (zero warnings). No AI, no new dependencies, offline.

The bridge (screenplay → breakdown → scenes → budget → casting) was wired but
produced almost nothing: the parser's element tagger matched a tiny hardcoded
vocab, so `parseScript(...).scenes[].elements` came back `{}` on a real scene.

- **Deterministic element extraction** (`extractElementsFromAction`): reads the
  ALL-CAPS runs in *action* text — the industry convention for tagging
  production elements — skips stopwords and the scene's own character names,
  categorises with the existing dictionaries, and defaults unmatched items to
  the props bucket. Dialogue never feeds it. Wire into `extractScenes` (replaces
  `tagElements`).
- **Pure breakdown core** (`lib/scriptos/breakdown.ts`): `aggregateElements` +
  `computeBudgetLines` (count × per-category rate). `lib/supabase/breakdown.ts`
  is now a thin adapter over it (same exports, so callers are unchanged).
- **`analyzeCharacters`** now uses the parser's resolved `characterName`, so
  `@MAYA` and `STEEL (beer raised)` produce a clean character, not `@MAYA`.
- `lib/scriptos/breakdown.test.ts` pins: categorisation (GLOCK→props,
  TRENCHCOAT→wardrobe, GUNSHOT→sfx, SMOKE→vfx), name-leak rejection,
  aggregation, budget synthesis (count × rate + no phantom "Vehicles (0)" line),
  and the empty-script case.

## Prior Session — Offline foundation: PWA shell, delete tombstones, offline session

Branch: `chore/offline-foundation`. Verified: **110 tests pass**; `next build`
green (zero warnings). No AI, no new dependencies.

Closes the gap between "the parse/edit path is already network-free" and "the
app actually works offline":

- **PWA shell** — `public/sw.js` (network-first navigations with cache fallback,
  cache-first `/_next/static`, stale-while-revalidate images/fonts, cross-origin
  never intercepted), `public/manifest.webmanifest`, `public/icon.svg`,
  `components/ServiceWorkerRegister.tsx` (prod-only), and layout `manifest` /
  `themeColor` metadata. The app can now load and reopen offline after a first
  visit.
- **Delete tombstones** — `deleteScript` records the id locally and replays the
  server delete on the next `syncPendingScripts` (replayed first, so a delete
  wins over any queued upsert); `getAllScripts` filters tombstones. Deleting
  offline can no longer resurrect on reconnect, and deleted content doesn't
  linger on the server.
- **Offline session** — `boot.ts` now uses `getOfflineSafeUser()` (`getUser()`
  with a `getSession()` fallback, since the former is a network-validating call)
  and `resolveSessionUser` falls back to a **device-level cached profile**
  (`localStorage 'mc_offline_profile'`). A returning signed-in user boots as
  `authed` with no network instead of being bounced to `/auth`. `osHydrateSession`
  and `bootOS` both route through it.

Combined with the existing `syncPending` outbox in `saveScript`, the core write
loop is now: save locally first → sync when back online. The one thing still
needing a real-device check is an airplane-mode cold start through the full
journey (Playwright `context.setOffline(true)` is the natural harness for it).

## Prior Session — ScriptOS: Normalize formatting + canonical Fountain export

Branch: `chore/scriptos-normalize`. Verified: **110 tests pass**; `next build`
green (zero warnings). Offline, no AI.

- `exportScriptAsText(…, 'fountain')` now downloads a **canonically-formatted**
  Fountain document (parse → serialize) instead of a raw content dump; `.txt`
  stays the author's source verbatim.
- Added a **"Normalize formatting"** action to the editor's Export dropdown. It
  runs `canonicalizeFountain(content)`, commits a history entry first so it is a
  single undo away, and toasts when the document is already canonical. Exposed
  through `EditorCtx.handleNormalize`.

## Prior Session — Fountain serializer + round-trip proof (Stage 1 complete)

Branch: `chore/fountain-serializer`. Verified: **110 unit tests pass** (4 new
round-trip tests), `next build` green (zero warnings). Offline, no AI.

- `lib/scriptos/fountain-export.ts` — a real **Fountain writer**
  (`serializeLine` per element + `serializeFountain` + `canonicalizeFountain`),
  closing the "reader but not writer" gap. The old `exportScriptAsText(...,
  'fountain')` was a raw content dump; this is the canonicalizer that doubles as
  the auto-format engine.
- **Round-trip contract, proven by test:** `parse(serializeFountain(parse(x)))`
  loses nothing at the *structural* level — same element-type sequence, same
  scenes (+ scene numbers + cast lists), same named characters. Fixed a subtle
  slug bug the property caught (a `#1#` strip left a trailing space → double
  space before the scene number).
- Canonical emission per element: forced markers resolved to their standard
  form (`.slug`, `@character` → bare word, `> transition`, `> centered <`,
  `~lyric`, `= synopsis`, `# section`, `[[ note ]]`, `/* boneyard */`, `^`,
  `===`), and an ALL-CAPS action is emitted with `!` so it can never re-parse
  as a character cue.
- `canonicalizeFountain` is **idempotent** (fixed point) — normalizing twice
  changes nothing, which is the property that lets a future "Normalize" button
  be safe to press.

Still deferred (as flagged): emphasis rendering in the *write* surface (rich
text), and wiring `canonicalizeFountain` to a UI action / the Fountain export
path. The suite bridge (breakdown → schedule → budget) re-hydrates from the
now-correct scene/element data.

## Prior Session — Fountain conformance layer on the parser (Stage 1, offline, no AI)

Branch: `chore/fountain-conformance`. Verified: `next build` green (zero
warnings), **106 unit tests pass** (12 new Fountain conformance tests).

- Ran a Fountain torture-test through the real parser and fixed **15 concrete
  correctness defects**, all deterministic/offline. The big one: a character cue
  with an inline parenthetical — `STEEL (beer raised)` — was misread as `action`
  because `isCaps()` tested the *whole line* instead of the name, silently
  corrupting dialogue attribution **and** scene cast lists. Now: name-part
  evaluation, correct `characterName`, cast lists populated.
- Added a **spec layer (`preClassify`)** that resolves unambiguous Fountain
  syntax *before* the scored heuristic, so forced elements can't be overridden:
  forced scene heading (`.`), forced character (`@`), forced action (`!`),
  forced transition (`>`), centered (`> <`), lyrics (`~`), synopses (`=`),
  sections (`#`), page breaks (`===`), notes (`[[ ]]`), and **boneyard (`/* */`)**.
- Scene numbers `#1#` now extracted; forced-slug heading strips the leading `.`.
- Dual dialogue: the `^` caret is typed `dual` (not a bogus dialogue line) and
  marks both the preceding and following blocks `isDualDialogue`.
- Added `LineType` members: `note | lyric | section | synopsis | dual |
  pagebreak | boneyard`. Preview now renders them honestly (boneyard struck,
  notes muted, sections bold, centered/lyric/synopsis styled, `^` hidden,
  page break shown as a gap) — no raw `#`/`===`/`/*`/`^` markup in preview.
- Boneyard is **typed, not discarded** (lossless round-trip: every source line
  still maps to one parsed line); fountains that drop it are a *render/export*
  concern, which is the next increment (serializer).
- `lib/scriptos/fountain.test.ts` pins all of it (source-losslessness, scene
  numbers, forced markers, cast lists, dual dialogue, boneyard/notes/sections).

### What "comparable to Fountain" still needs (not done)

`emit.ts` (a real serializer — the Fountain export is still a raw dump) and the
round-trip property harness; emphasis-mark rendering in the *write* surface is
rich-text work and stays for later. Then the suite bridge (breakdown → schedule
→ budget) re-hydrates from the now-correct scene/element data.

## Prior Session — Auth journey tested live; post-login redirect + hydration race fixed

Branch: `chore/auth-journey-fix`. Verified: `next build` green (zero warnings),
94 unit tests pass, and a **live end-to-end run** against the real Supabase
project (3/3 passing).

### What was actually tested (not assumed)

Added `e2e/auth-journey.spec.ts` — opt-in (`E2E_LIVE_AUTH=1`) because it creates
real accounts. It drives the real form and the real backend. Findings:

- **Account creation works.** `/auth/v1/settings` reports
  `disable_signup: false`, `mailer_autoconfirm: true`; signup returns a session
  immediately, and the `on_auth_user_created` trigger creates the profile row
  (verified the new row, username taken from signup metadata).
- **RLS holds for a brand-new user**: 0 projects visible, and creating one
  returns 201 with default project settings.
- **All 10 authed surfaces opened for a fresh account** — `/projects`, `/studio`,
  `/editor`, `/lounge`, `/soundtrack`, `/portfolio`, `/crew`, `/jobs`,
  `/settings`, `/profile` (recorded in the run log; no surface bounced).
- **Schema reconciliation confirmed against live**: `script_annotations` exists,
  `scenes.elements` exists, `beats` + `marketing_campaigns` are gone.

### The real bug that was found and fixed

`middleware.ts` correctly sends gated visitors to `/auth?redirect=<path>`
(observed: `/auth?redirect=%2Fstudio`), but the auth page **ignored it** and did
`setTimeout(() => router.push('/projects'), 600)`. Two defects in one line:

1. Deep-linked users (e.g. opening `/studio` while logged out) were always
   dumped on `/projects` instead of their destination.
2. The blind 600 ms timer raced the async session resolution. `useOSGate()` on
   the destination reads the OS store, so if the store still said `anon` the
   page bounced straight back to `/auth` — and `/auth` had no "already signed
   in, move along" behaviour, so the user sat stranded on the sign-in form. That
   is the "sometimes looped" report.

Fixes:
- `osHydrateSession()` (`lib/os/boot.ts`, exported through `lib/os`) resolves
  profile + projects into the OS store. `osSignIn`/`osSignUp` now **await** it,
  so the store is authoritative before any navigation happens.
- `osSignUp` settles back to `anon` when signup returns no session (the
  email-confirmation path), instead of stranding the store in `resolving`.
- The auth page navigates on the store reporting `authed` — no timer — and
  honours `?redirect=` (same-origin absolute paths only; `//` and `/auth`
  rejected), so a signed-in visitor to `/auth` is also forwarded onward.
- Signup with confirmation enabled now keeps the user on `/auth` and tells them
  to confirm, rather than bouncing into a gated page.

### Open finding — `profiles.is_admin` is world-readable (needs a decision)

Reading `profiles` as a brand-new account returned **every** profile row,
including accounts with `is_admin: true`. `profiles` has
`SELECT USING (true)` (the public crew/showcase directory depends on that), but
`is_admin` leaks admin identity and enables user enumeration.

Not fixed here on purpose: a column-level `REVOKE SELECT (is_admin)` breaks the
five `select('*')` call sites — including `lib/os/boot.ts`, which drives
permissions — so the correct fix is either (a) `internal.is_admin(uid)` exposed
to the client plus explicit column lists everywhere, or (b) moving the flag to a
separate table readable only by admins/self. That is an RLS change with persona
testing, so it wants its own PR.

### Also

- Test accounts created by the verification were **deleted** afterwards
  (projects, then dependent rows — `scripts_last_edited_by_fkey` blocks the
  user delete — then the auth users). 0 probe accounts remain. Note: ~8 older
  `mctestuser*` / `logintest*` / `qa*` accounts from previous sessions are still
  in the project; they were left alone as they are not ours to judge.

## Prior Session — Scheduler wired into the UI, unused deps dropped

Branch: `chore/scheduler-and-deps`. Verified: `next build` green with **zero
lint warnings**, 94 unit tests pass.

- **`lib/scriptos/schedule.ts` is no longer dead code.** It was referenced only
  by its own test while the real auto-scheduler lived inline in
  `app/studio/page.tsx`. The Studio page now runs the tested
  `generateShootingSchedule` over the parsed screenplay and the Production →
  Schedule tab renders a **Script Breakdown** card from it: scene count,
  estimated runtime, unique locations, unique characters, word count, and the
  top location groups ranked by scene count with per-group minute estimates.
  Derived from what is *written*, so it is useful before anything is imported
  into the scene list. Added an exported `ShootingSchedule` type rather than
  threading `any` through `StudioCtx`.
- **Dropped the two unused dependencies**: `tailwind-merge` and `recharts`
  (zero references in app/lib/components/config). 39 packages removed.
- Fixed a `react-hooks/exhaustive-deps` warning introduced by the new effect
  (project id captured outside the effect, used as the dependency).

## Prior Session — Dead-code purge, zod validation layer, doc/schema reconciliation

Branch: `chore/production-hardening`. All verified: `tsc --noEmit` clean,
`npm run lint` clean, **94 unit tests pass** (was 63), `npm run build` green.

- **Cleaned a broken local environment first** (this had been silently blocking
  local verification): `node_modules` had a corrupt `@next/swc-win32-x64-msvc`
  binary and a missing `lucide-react` .d.ts, so `npm run build` failed locally
  even though CI was green. Full clean `npm ci` fixed it. `next.config.js` now
  pins `outputFileTracingRoot` so a stray `package-lock.json` above the repo
  can't be picked as the workspace root.
- **Deleted 23 verified-dead modules** (zero inbound references, checked by
  basename scan *and* import-graph scan): `lib/scriptos/{advanced-formatter,
  auto-save,editor-utils,export-pro,fountain-export,parser.worker,pdfGenerator}.ts`,
  `lib/{api-validation,network-retry,useScript,animations/variants}.ts`,
  `components/{AnimatedText,CrewManagementModal,LoungeDock,MagBtn,PageTransition,
  PhotoScatter,RoleBasedNav,NetworkStatus}.tsx`, `components/canvas/{CanvasPin,
  PannableCanvas}.tsx`, `components/editor/DiffModal.tsx` (restored — see below),
  `lib/hooks/useNetworkStatus.ts`. Dropped unused deps `tailwind-merge` +
  `recharts` — **not done yet, see "Not done" below.**
- **Revision "View" button was a native `alert()`** and `showDiff`/
  `diffRevisionId` in `app/editor/page.tsx` were dead, never-wired state — a
  half-implemented feature. Fixed properly: restored `DiffModal`, wired it to
  the revisions panel (`onViewRevision`), and removed the `alert()`. Zero
  native `alert()`/`confirm()` remain in the app (every `confirm(` left is the
  shared `useConfirm()` hook).
- **Zod (v4) implemented** as the single validation seam: new
  `lib/validation/index.ts` (schemas + `parseJsonBody`/`firstIssue`/`issueMap`,
  types derived with `z.infer`). Wired into all three API routes —
  `/api/discord/notify` (body), `/api/discord/test` (body), and
  `/api/references/search` (query) — and into the auth form (sign-in/sign-up).
  31 new unit tests cover the schemas, including lookalike-host webhook
  rejections. Replaced the hand-rolled `lib/api-validation.ts` (which was dead).
- **Security hardening found by that work:** `/api/discord/test` had **no auth
  and no rate limiting** even though `RETROSPECTIVE_2026-07.md` claimed it was
  fixed. Now requires a Bearer token + is rate limited (caller updated to send
  the token). `/api/references/search` is now rate limited too. `/api/discord/
  notify` re-validates the stored webhook URL before fetching it (SSRF guard)
  and no longer uses `!`-asserted env vars.
- **Schema reference reconciled** (`supabase-schema.sql`): helpers moved
  `public.*` → `internal.*` (matching live + all docs; `public.*` was dropped on
  live and caused the documented 42883 outage), added `CREATE SCHEMA internal`
  + REVOKE/GRANT, added the missing `script_annotations` table and
  `scenes.elements` column (both used by live app code but absent from the
  reference), and removed the two dead `beats`/`marketing_campaigns` tables.
  The previously **untracked** redesign migration is now committed as
  `supabase-migration-cavern-suite-redesign.sql` (was a schema-mirror gap).
- **Intelligence hub repaired**: restored the 8 `.cavern-intelligence/*.md` docs
  that `AGENTS.md`/`INDEX.md` referenced but PR #39 had deleted, and restored
  `scripts/sync-intel.js` + the `npm run sync-intel` script they instruct agents
  to run. Fixed real drift in the *new* docs: `conventions.md` pointed at the
  deleted `lib/permissions/` tree and claimed `strict: false` (it is `true`);
  `routing-and-surface.md` documented `AuthProvider`/`ProjectProvider` (the
  app mounts `OSProvider`) and listed chrome components that aren't mounted;
  `tools-and-access.md` described CI env as secrets (they're `vars.*`).
- Manifest regenerated: 201 tracked files.

### Not done in this session (needs owner or infra)

1. `tailwind-merge` + `recharts` are still in `package.json` (zero usages) —
   removal was deferred so this PR stays reviewable.
2. `lib/scriptos/schedule.ts` is referenced **only by its own test**; the real
   auto-scheduler lives inline in `app/studio/page.tsx`. Either wire the lib
   function into the UI or delete it — decided to leave for the owner.
3. Persona e2e in CI (Sam/Jordan/Riley) — needs a seeded Supabase test project
   (infra, flagged by both prior audits).
4. Production error sink (Sentry or similar) — needs a vendor choice.
5. Live-DB verification of the schema changes could **not** be run from this
   environment (no network access to `supabase.co`); the `internal.*` alignment
   is based on STATE.md history + `database-and-security.md` + `CLAW.md`.
   Worth one `list_tables` check.

## Prior Session — Harness access + intelligence hub rebuild

- **Committed Claude Code access config** (`.claude/settings.json`, was absent):
  `enableAllProjectMcpServers`; `allow` for safe dev/verify/git + read MCP tools;
  `ask` for consequential ops; `deny` on main-push / `.env*` / `sudo` / `rm -rf`.
  Per owner request, **`apply_migration` and `deploy_to_vercel` are now in
  `allow`** (no prompt) — the branch→PR→persona-test workflow is the safety net.
- **SessionStart hook** `.claude/hooks/session-bootstrap.sh` injects
  `AGENTS.md` + `STATE.md` every session (survives ephemeral containers).
- **Rebuilt `.cavern-intelligence/` into a full hub** — added `INDEX.md`
  (front door + read order), `tools-and-access.md` (MCP/permissions/skills/env),
  `routing-and-surface.md` (all 30 routes, gating tiers, providers, module
  ownership), `conventions.md` (data-access layer, toast/confirm, migrations,
  the "usually inline" patterns). Wired them into `AGENTS.md`'s Deep Context
  table; trimmed `CLAW.md`'s stale hard-coded state to defer to this file.
  Manifest regenerated → 266 tracked files.
- **CI blocker (unchanged, out of scope):** `next build` fails at
  `/api/discord/notify` because `NEXT_PUBLIC_SUPABASE_ANON_KEY` is blank in
  Actions secrets and the route eagerly builds a Supabase client. Fix = set the
  secret + lazy-init the client (the lazy-init already exists in PR #39). Not
  cherry-picked here per owner instruction.

## Active Iteration

Repo audit + hardening pass (Milestones 0–1 of the audit plan in `~/.claude/plans/you-are-a-world-class-typed-corbato.md`): CI pipeline, unit-test harness, Discord notify route auth, real middleware session validation.

## Last Change Summary

- **CI**: `.github/workflows/ci.yml` — typecheck + lint + vitest + build, plus unauthenticated Playwright smoke job. Needs `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` repo secrets.
- **Unit tests**: Vitest added (`vitest.config.ts`); 36 tests covering `lib/scriptos/parser.ts` and `lib/permissions/access-matrix.ts`. `npm run test`.
- **Security — notify route**: `/api/discord/notify` now requires a Bearer access token (401 otherwise), derives sender identity from the verified JWT (body `senderId` removed — spoofing closed), and 403s unless the caller can view the channel under RLS. Caller updated in `lib/supabase/messages.ts`.
- **Security — auth**: browser client migrated to cookie-backed `createBrowserClient` (`@supabase/ssr`); middleware now validates the session via `getUser()` (forged/expired cookies rejected) and gates `/admin` on server-verified `profiles.is_admin`. **Existing localStorage sessions are not migrated — all users sign in once more after deploy.**
- Quick wins: `typecheck`/`test`/`test:e2e` npm scripts; `updateProject` errors now surface via toast; debug `console.log` removed from ParticleBackground; Supabase image host in `next.config.js` derived from env.
- Fixed broken `e2e/auth-validation.spec.ts` (targeted nonexistent `/auth/signup` + label selectors that never matched) — now passes against the real `/auth` signup mode.
- `sync-manifest.json` at 220 tracked files.

## Second Pass (same session) — DB verification, types, drift fixes

- **Live RLS verified**: every public table has RLS enabled; anon (Riley) sees 0 rows in channels/channel_members/discord_integrations/messages.
- **Recovered + committed** the uncommitted `project_channels_system` DDL as `supabase-migration-project-channels-system.sql`.
- **Fixed a live production outage**: `can_post_channel` / `can_view_channel` / `can_manage_channel` referenced helpers by their old `public.*` names after they moved to `internal`, so all three raised 42883 — breaking the channels SELECT policy and every channel message insert. Fixed via prod migrations `fix_can_post_channel_schema_reference` + `fix_channel_helpers_internal_schema_references`; committed SQL matches.
- **Generated Supabase types** (`lib/supabase/database.types.ts`), client is now `createBrowserClient<Database>`; `Database = any` gone.
- Types immediately caught **4 schema-drift bugs**, all fixed: `scripts.page_count` (broke hub script count), `projects.is_public` (broke projectAccess loading in AuthContext), `sfx_assets` insert used 4 nonexistent columns + missing required `project_id` (every SFX upload failed), CommandPalette queried nonexistent `assets` table (now `project_assets`).

## Third Pass — full-suite logic audit (every page/button/query)

Three parallel audits verified ~180 buttons/actions and every `supabase.from()`
call across all 27 routes against the generated schema. Sign-in redirect loop
fixed and verified live in production (cookie-backed session + validating
middleware, commit 9e68493). Additional defects found and fixed:

- soundtrack SFX panel (5): consumed nonexistent `bucket_path`/`file_name`/
  `category` columns — uploads were unplayable, untitled, and unsavable to the
  Audio Bible. Now reads `audio_url`/`title`/`tags`.
- profile page: `jobs.company/location` don't exist — the select error blanked
  ALL profile lists and stat counts. Now selects `role`/`status`.
- jobs board: failed job post was silent — now toasts the error.
- CrewManagementModal: role dropdown now gated by `manage_crew` (was enabled
  for viewers and silently failed at RLS).
- admin/users: removed duplicate ANALYTICS tab link.

Clean areas: home, projects, project hub, pitch board, portfolio (+manage),
p/[token], s/[token], showcase, studio, editor + ScriptOS libs, Spotify,
lounge + channels + voice, jobs, crew, settings, admin ×4, auth ×3, taskbar/
nav/notifications.

## Known Issues

1. Leaked-password protection — dashboard toggle, owner must flip it (also flagged by security advisor)
2. README / production branding / docs polish — partial pass done, could use another round
3. `tsconfig.json` still `strict: false` (audit plan M2.2)
4. `npm audit`: 5 vulnerabilities (1 moderate, 4 high) reported at install — triage pending
5. Security advisor WARNs: public buckets (`sfx-library`, `studio-assets`) allow listing; `has_discord_webhook` executable by anon — review intent

## Last Session

Merged `claude/charming-galileo-fewe3n` (4 commits ahead: Pitch board refactor, Supabase skill install, portfolio_blocks migration fix, merge back). Only conflict was `app/projects/[id]/page.tsx` — replaced the `publishToPortfolio` + manual publish button with a "BUILD PITCH BOARD" link to `/projects/[id]/pitch`. Removed `createPortfolioProject` import, `publishing` state, and `publishToPortfolio` function. Published portfolio entries now show "EDIT BOARD" link instead of "PUBLISHED" badge. All verification passes.

Prior: Polished README with badges, testing section, agent dev section, updated repo map. Created full Sam-persona e2e smoke test suite. Fixed pre-existing ESLint errors across 7 files (unescaped entities) and restructured lounge/page.tsx to fix conditional hooks violation. Consolidated 14 tables with overlapping permissive RLS policies — dropped redundant SELECT policies (project_tasks, project_beats, timeline_items, budget_items, beats, concept_assets, scenes, campaigns, character_castings, script_metadata), converted overlapping ALL policies to specific INSERT/UPDATE/DELETE on portfolio_projects/portfolio_media/portfolio_blocks, scoped scripts SELECT to authenticated role. PR #7 already closed. Implemented leaked-password protection: HIBP k-anonymity check in `lib/password-strength.ts`, toggle in Settings → Data & Privacy (persisted to `profiles.notification_prefs.leak_check`), wired into auth signup and settings password change flows.
- `AGENTS.md` at repo root — universal entry point (read by all AI tools natively)
- `CLAUDE.md` — Claude Code adapter (refs AGENTS.md + MCP config)
- `.github/copilot-instructions.md` — VS Code Copilot adapter
- `.cavern-intelligence/design-tokens.md` — full visual rubric from globals.css
- `.cavern-intelligence/playbook.md` — detailed 7-step change workflow
- `.cavern-intelligence/STATE.md` — iteration tracking file
- `.eslintrc.json` — initialized ESLint with Next.js core-web-vitals
- `sync-protocol.md` — expanded to cover all agent types (Codex, Cursor, Cline, etc.)

## Verification Results

```bash
npx tsc --noEmit    # TypeScript: clean
npm run build       # Next.js build: clean (warnings only)
npm run lint        # ESLint: configured (pre-existing warnings only)
npm run sync-intel  # Manifest: 216 files
```

## Pre-existing Lint Warnings (non-blocking)

- `react/no-unescaped-entities` — all fixed
- `react-hooks/rules-of-hooks` in lounge/page.tsx — fixed (hooks hoisted above guard)
- `@next/next/no-img-element` — 20+ occurrences, use <Image /> when refactoring
- `react-hooks/exhaustive-deps` — 15+ occurrences across files, add deps when refactoring
- `jsx-a11y/alt-text` — 3 occurrences, add alt text when refactoring
