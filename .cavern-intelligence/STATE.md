# Misfits Cavern — Project State

> Injected into every session — keep it short: open work and the latest
> session only. Every open task, scoped: [BACKLOG.md](BACKLOG.md). Older
> sessions: [STATE-history.md](STATE-history.md).

## Open work — start here

Full scope for each in `BACKLOG.md`. In order:

1. **Owner, outside the code**: Supabase usage — the dashboard says the
   free-plan grace period is over (Organization › Usage: which line is over);
   lawyer review of `/privacy` and `/terms`;
   leaked-password protection (Supabase › Auth › Passwords); the two old
   stashes on the Windows machine; optionally branch protection on `main`
   (enables auto-merge).
2. **Verify** `e2e/onset-offline.spec.ts` on Windows with the older local
   Chromium (passes in CI and the cloud container).
3. **Upgrades**: data access through `lib/` (L, under way: 94 calls left) ·
   activity feed completeness (M, product call) · emphasis in the writing
   surface (M) · story beat → script (M/L) · dev-toolchain advisories
   (watch upstream).

Open PR: #137 (`claude/design-scales`: run driver, `source-map-js`, data
access for jobs/profile/crew/export).

## Known issues

- Leaked-password protection is off (owner toggle; security advisor WARN).
- *Production schema drift* runs nightly and passes (2026-10-06: production
  matches the snapshot). It logs in as `drift_reader` (catalog reads +
  bucket settings only; `tools-and-access.md` §7).
- Supabase free plan: "grace period is over" banner. Database 23 MB, storage
  46 kB, 20 users, ~200 requests/day — all well inside the limits, so the
  overage is something only the dashboard shows (likely egress or Realtime).
- `npm audit`: production deps clean (2026-10-06, after the `source-map-js`
  bump); 7 high + 2 moderate in dev tooling only (`braces`
  via Tailwind's watcher and `eslint-config-next`; fix needs upstream) —
  BACKLOG 3.1.
- Security advisor: `SECURITY DEFINER` RPCs callable by anon (9) and signed-in
  users (23 more) — the intended API, each gated, reviewed in
  `database-and-security.md` §2.D.

## Latest Session — Data access through `lib/` begins; stale branches gone

No migration.

- **BACKLOG 3.2 under way: 110 → 94 direct `supabase.from()` calls.** Jobs
  board and posting page (`lib/supabase/jobs.ts`), profile, crew directory,
  crew member and Settings › Export (`lib/supabase/profiles.ts`) now call
  typed module functions. What the move turned up:
  - **Settings › Export could download an incomplete file**: each failed
    query became an empty list. It now fails with a message
    (`collectMyData`).
  - My Jobs counted applicants with one query per posting; now one
    embedded count.
  - Silent load failures on jobs, the posting page, profile and a crew
    member's portfolio now show a toast or message.
  - Unused helpers removed, among them `searchJobs`, which put typed text
    straight into a PostgREST `or()` filter.
- **`source-map-js` 1.2.2** (new high advisory on a production dependency,
  via Next's postcss); `npm audit --omit=dev` is 0. npm on Windows strips the
  lockfile's `libc` fields, so lockfile bumps made on Windows need checking:
  only the package's own lines should change.
- **17 stale remote branches deleted** (BACKLOG's audited list; each tip
  matched the recorded one first). `claude/design-scales` was on that list
  but now carries PR #137, so it stays. One branch not in the audit is
  left: `claude/state-assessment-testing-r0tf3y`.
- **Run driver** stops only what listens on its port (it ran
  `taskkill /im node.exe`).
- Tests: `e2e/your-data.spec.ts` (new: profile, directory, export file);
  `e2e/hiring.spec.ts` checks the My Jobs applicant count. Local stack on
  Windows: hiring, your-data, account-deletion, credits, availability,
  route-smoke, real-data pass. Types, lint, unit tests (472), build: clean.
- Windows note: `npm run stack:up` fails here (it hands Node a POSIX `/tmp`
  path); run its steps by hand (`npx supabase status -o json`, build with
  the URL and anon key, `npm start`).

## Earlier — Lint pass 3: no hidden dependencies

No migration.

- **`react-hooks/exhaustive-deps` has no disables left** (was 20). Each hid a
  dependency; now an effect event (`useEffectEvent`) wraps the helper or
  callback the effect calls (editor mount + project follow, jobs, project
  hub, script sync's remote handler, voice presence, on-set offline seed,
  phase reveal, the island's Caps Lock keys), or the effect depends on
  extracted keys (Lounge crew, island project switch) or memoised values
  (island apps, CutPlayer embed, split-pane refs, CastingBoard loader).
  The editor's keydown handler is a plain function (its `useCallback` hid
  stale helpers and memoised nothing).
- **`usePillStage(descriptor)`** no longer takes a hand-kept deps list: it
  republishes when the JSON of what it shows changes (6 pages updated).
- **Every remaining disable carries a `-- reason`**: 22
  `@next/next/no-img-element` (signed storage URLs, pasted links,
  third-party thumbnails — `next/image` doesn't fit) and 2 justified
  `set-state-in-effect`. Patterns in `conventions.md` §10.
- Lint, typecheck, unit tests (472), build: clean.

