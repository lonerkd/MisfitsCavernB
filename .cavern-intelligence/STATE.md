# The Cavern — Project State

> Injected into every session — keep it short: open work and the latest
> session only. Every open task, scoped: [BACKLOG.md](BACKLOG.md). Older
> sessions: [STATE-history.md](STATE-history.md).

## Resume here (handoff, 2026-11-07)

1. **`main` is current.** Start with `git switch main && git pull`; then `node scripts/latest-sessions.js` for what the last PRs did, and `gh pr list` for what is open.
2. **Production matches `main`** (2026-11-07: every migration through `20261106000100` is applied to production and to staging, and production equals `main`'s `schema.fingerprint` in all 14 categories — checked by running `supabase/fingerprint.sql` through the database tool, since a session has no production connection string for `npm run db:drift -- --target`). Previews run on the staging project `cavern-staging` (ADR 0006); each merged migration goes to production, then staging (`database-and-security.md` §3).
3. **Web Push is live in production** (2026-10-25): VAPID keys and `PUSH_DISPATCH_SECRET` in Vercel (Production), `internal.push_config` set; a test notification reached the owner's iPhone (`sent: 1`). Staging has no push config (off, by design).
4. **Owner's dashboard list for password recovery (3.4, shipped):** a custom
   SMTP sender (Supabase's built-in one only mails team members, so real users
   won't get reset emails); add `https://misfits-cavern-b.vercel.app/**` to
   Auth › URL Configuration › Redirect URLs; mark the two open GitGuardian incidents
   (test fixtures) false positives; delete the two throwaway e2e accounts an
   earlier session made in production (Authentication › Users).
5. **Local setup**: `npm ci`; `.claude/skills/` has three real skills
   (`run-misfits-cavern`, `supabase`, `supabase-postgres-best-practices`);
   context loads from `CLAUDE.md`. In a cloud container Docker dies between
   commands — start `dockerd` as a background task, `npm run db:start`
   (mail catcher on :54324), `npx supabase stop` first if it came up from stale
   containers. Never push to `main` (**nobody can now: the `main-2` ruleset has no bypass**); PR from a `claude/*` branch; merge only
   once the required checks are green (`conventional`, `checks`, `database`, `gate`; the branch must be up to date with `main`) (owner, 2026-10-27: merge without waiting for the word; production follows main; flags are on in production).
6. **Stats are real (2026-11-03/05):** the public totals leave out sample, test and bot accounts (10 old QA accounts flagged `is_sample` by hand; migration `20261103100000` also leaves out a sample account's loose scripts; both live in production). Still to do: delete the throwaway QA accounts (BACKLOG 3.37).
6a. **How a change gets in (2026-11-07, `tools-and-access.md` §9):** every PR runs `gate` (`scripts/pr-gate.mjs`, read from the base branch: tests with code, a session note, a migration is never edited, a definer function is on the allowlist, RLS on a new table, a reviewable size, defined tokens, a lint baseline that only shrinks; a waiver is a visible line in the description) and the lint ratchet. A **high-risk** PR (database, CI, the enforcement scripts, auth, dependencies) also needs a Claude review: run the `code-review` skill, then `node scripts/claude-review.mjs --pr <n> --post approved|changes --summary "..."`; the `claude-review` status is bound to the head commit, so a push makes an old approval stale. It is **not yet a required check**: make it one after it has run green on a real high-risk PR. A session's permission system may refuse to post its own approval; then the owner merges, or posts it.
7. Decided: the internal `mc_` / `mc-` prefixes stay. Open with the owner:
   the domain. An installed iPhone app keeps its old icon until re-added to
   the Home Screen (iOS caches it).
8. **Last built (2026-11-05…07):** mood boards; Community; the island's Live (editor sprint), Share and Undo tile and the fix that stops every page's island actions going stale; the merge gate, the lint ratchet and the head-bound Claude review; the `main-2` ruleset with no bypass; the 16 record-keeping production tools made right (one `useSettingsList` hook, every form shows on an empty project, real revisions, the Stripboard's day-out-of-days, Misfit as the default theme at AA); production and staging migrated. Open for the island: recording, the other upload paths, the On set clock as a held activity, a Note slot, the Lounge's Live (BACKLOG 4.1).


## Direction (owner, 2026-10-10)

The suite becomes one connected core — **the film graph**: scenes, characters,
locations, shoot days, story days, elements, shots and people as real linked
rows, plus a universal layer so anything attaches to anything. Design:
[film-graph-spec.md](film-graph-spec.md) (approved; steps 1 (days and places → daylight), 2 (characters, who is in each scene, casting by id) and 3 (story time and continuity) are built; what is left is BACKLOG 3.18). This comes before the wishlist ranking.

## Open work — start here

Full scope for each in `BACKLOG.md`. The whole suite, top to bottom:
[`bible/`](bible/README.md). In order:

1. **Owner, outside the code** (owner: "good for now" — revisit before
   launch): the SMTP sender and redirect allow-list (above), Supabase usage
   (grace period over — which line?), lawyer review of `/privacy`, `/terms`
   and `LICENSE`, leaked-password protection, the two old Windows stashes,
   signed commits, the first `v*` tag, the domain. (Branch protection is done: 2026-11-07, `main-2`.)
3. **Next code work**: **notes** (owner, 2026-11-07: three layers: private, project, writer; author edits, project owner also on project notes; project and writer notes notify; the island's `U` key), then restructure
   phases 7–8 (`restructure-proposal.md`: thin pages, optional Studio
   routes); admin catalogues + moderation (3.14); email (3.15);
   activity feed (3.5, product call); dev-toolchain advisories
   (3.1, watch upstream). **Owner decision open:** let crew write the role tools (needs per-record tables with RLS, BACKLOG 3.38). **Found, not fixed:** the editor's "Force type" does not change the line it is set on (BACKLOG 3.38 (5)).
4. **Verify** `e2e/onset-offline.spec.ts` on Windows with the older local
   Chromium.
5. **Wishlist** (owner, 2026-10-07): ranked and scoped in
   `wishlist-ranking.md` — start with the island's live activities (slice 1:
   the engine, network/sync, timers), then money, version compare, interchange.

## Known issues

- Leaked-password protection is off (owner toggle; security advisor WARN).
- *Production schema drift* is **green** (2026-10-25, after the seven
  migrations of 10-16…10-19 were applied). It logs in with a read-only
  catalog role (`tools-and-access.md` §7).
- Supabase free plan: "grace period is over" banner. Database 23 MB, storage
  46 kB, 20 users, ~200 requests/day — all well inside the limits, so the
  overage is something only the dashboard shows (likely egress or Realtime).
- `npm audit`: production deps clean; 7 high in dev tooling only (`braces`
  via Tailwind's watcher and `eslint-config-next`; fix needs upstream) —
  BACKLOG 3.1.
- Security advisor: `SECURITY DEFINER` RPCs callable by anon (11) and signed-in
  users (39 more, 2026-10-25 advisor) — the intended API, each gated, reviewed in
  `database-and-security.md` §2.D.

## Latest sessions

One note per PR, newest first, in [`sessions/`](sessions/README.md) — a Claude Code session prints the latest three at start. `STATE.md` itself changes only for the handoff (Resume here, Open work, Known issues), so PRs no longer collide on it.
