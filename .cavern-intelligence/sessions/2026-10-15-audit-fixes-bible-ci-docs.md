# Session — 2026-10-15: the audit's first fixes — the bible generator, CI gates, doc contradictions, one `as any` gone

An audit of the repo's history, workflows and the `.cavern-intelligence`
system found contradictions, a silently-broken generator, and two soft CI
gates. This PR fixes what was verifiable; the rest is filed.

**Found and fixed:**

1. **`scripts/bible.mjs` was Windows-broken** — `walk()` joined paths with
   `\`, so `/\/(page|route)\.tsx?$/` never matched on the owner's machine
   (it generated an inventory with **0 routes**). That's why the map sat
   stale since 2026-10-10: nobody *could* regenerate it here. All paths now
   normalize to POSIX separators once (`posix()`); `resolve`, `routeOf` and
   the `components/`/`lib/` prefix filters use the same normalization.
2. **CI enforces the map and the session notes** — the `checks` job now runs
   `npm run bible` and fails if `bible/inventory.md` drifts (same pattern as
   `db:types:check`), and `check-sessions` lost `continue-on-error` (the note
   that added it said "wire it in when Actions is back" — Actions is back).
3. **Contradictions in the docs** — STATE.md said restructure "phases 4–8"
   were next; phases 4, 5 and 6 are done (proposal marks them; phase 6's
   "one permission model" landed 2026-10-07 as `useCanShape` +
   `ProtectedPage`). BACKLOG §3.23 sat *after* the whole wishlist; moved into
   §3. `restructure-proposal.md` linked to dead BACKLOG numbers (3.2, 3.10)
   and stale counts (472 unit / 39 e2e; real: 1,000+ unit, 56 integration
   suites, 69 specs).
4. **`lib/supabase/projects.ts`** — the residual `as any` on the `projects`
   update was hiding a real mismatch: `DBProject.share_token` said
   `string | null` but the column is `NOT NULL` and the generated types say
   `string`. Cast removed, type corrected — `updateProject` is fully typed now.
5. **Validator** — the dead `content` parameter (and its unused `rawLines`)
   is gone; `validator.test.ts` now parses and passes scenes + characters like
   the editor does, so the structure rules (character-intro, scene-length,
   dialogue-length, act1-pacing) actually run in CI, with a regression test
   that fails if scenes stop being passed. The four editor components that
   imported `validateScript`/`LintIssue` and never used them no longer do.
6. **Hygiene** — `docs/island-shots/` restored (owner decision; the island's
   five states); `*.err` gitignored.

**Verified:** typecheck (exit 0), lint (0 errors), unit tests, production
build, `sync-intel --check` clean, `npm run bible` now reproduces the
committed inventory on Windows (45 routes · 39 pages · 70 tables · 53
functions · 69 specs).

**Not verified here:** the CI bible-gate on a Linux runner (it will run on
this PR — and did: `checks` passed with the gate in place).

**Discovery — the nightly drift check is failing and it is genuine:** the dispatched drift run
failed, and it is not noise. Production's `internal.timesheets_guard()` body
differs from the committed fingerprint; the fingerprint line has not changed
since PR #81, so production was edited outside a migration between
2026-10-12 15:50 and 10-13 00:52 (the last passing nightly). The nightly check
has failed on every run since. STATE.md's "drift passes" claim was stale and
is corrected; BACKLOG §1 now carries the owner decision (restore production
to the migration, or migrate production's version forward).

**Owner follow-ups unchanged:** branch protection is still yours (see BACKLOG
§1 — `conventional`, `checks`, `database` as required checks); the two
standalone HTML design specs at the root are still untracked.
