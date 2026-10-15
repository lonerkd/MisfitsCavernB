# The Cavern — Project State

> Injected into every session — keep it short: open work and the latest
> session only. Every open task, scoped: [BACKLOG.md](BACKLOG.md). Older
> sessions: [STATE-history.md](STATE-history.md).

## Resume here (handoff, 2026-10-15)

1. **`main` is current.** Start with `git switch main && git pull`; then `node scripts/latest-sessions.js` for what the last PRs did, and `gh pr list` for what is open.
2. **Production has all six migrations** (checked 2026-10-15 against the live database: tables `scene_states`, `reading_corrections`, `reports`, column `scenes.story_confirmed`, functions `admin_close_job`, `admin_reported_message`, `admin_hide_message`, `admin_list_users`, `admin_set_suspended`). Still to do: run **Production schema drift** (workflow id 367546497, `gh api -X POST repos/lonerkd/MisfitsCavernB/actions/workflows/367546497/dispatches -f ref=main`) and record it in a session note.
3. **Then Web Push setup** (BACKLOG 3.13): VAPID keys in Vercel, and the
   dispatch URL + secret in `internal.push_config`; see
   `adr/0004-push-dispatch-from-the-database.md` and `lib/push/`.
4. **Owner's dashboard list for password recovery (3.4, shipped):** a custom
   SMTP sender (Supabase's built-in one only mails team members, so real users
   won't get reset emails); add `https://misfits-cavern-b.vercel.app/**` to
   Auth › URL Configuration › Redirect URLs; mark GitGuardian incidents
   37942181 and 37942439 false positives (test fixtures); delete the two
   accounts `e2e.recover.*@example.com` an earlier session made in production.
5. **Local setup**: `npm ci`; `.claude/skills/` has three real skills
   (`run-misfits-cavern`, `supabase`, `supabase-postgres-best-practices`);
   context loads from `CLAUDE.md`. In a cloud container Docker dies between
   commands — start `dockerd` as a background task, `npm run db:start`
   (mail catcher on :54324), `npx supabase stop` first if it came up from stale
   containers. Never push to `main`; PR from a `claude/*` branch; merge only
   on the owner's explicit "merge".
6. Decided: the internal `mc_` / `mc-` prefixes stay. Open with the owner:
   the domain. An installed iPhone app keeps its old icon until re-added to
   the Home Screen (iOS caches it).

## Direction (owner, 2026-10-10)

The suite becomes one connected core — **the film graph**: scenes, characters,
locations, shoot days, story days, elements, shots and people as real linked
rows, plus a universal layer so anything attaches to anything. Design:
[film-graph-spec.md](film-graph-spec.md) (approved; steps 1 (days and places → daylight) and 2 (characters, who is in each scene, casting by id) are built; next is step 3). This comes before the wishlist ranking.

## Open work — start here

Full scope for each in `BACKLOG.md`. The whole suite, top to bottom:
[`bible/`](bible/README.md). In order:

1. **Web Push setup** (above).
2. **Owner, outside the code** (owner: "good for now" — revisit before
   launch): the SMTP sender and redirect allow-list (above), Supabase usage
   (grace period over — which line?), lawyer review of `/privacy`, `/terms`
   and `LICENSE`, leaked-password protection, the two old Windows stashes,
   branch protection on `main` (`pr-title`, `checks`, `database` required),
   signed commits, the first `v*` tag, the domain.
3. **Next code work**: restructure
   phases 7–8 (`restructure-proposal.md`: thin pages, optional Studio
   routes); admin catalogues + moderation (3.14); email (3.15);
   activity feed (3.5, product call); dev-toolchain advisories
   (3.1, watch upstream).
4. **Verify** `e2e/onset-offline.spec.ts` on Windows with the older local
   Chromium.
5. **Wishlist** (owner, 2026-10-07): ranked and scoped in
   `wishlist-ranking.md` — start with the island's live activities (slice 1:
   the engine, network/sync, timers), then money, version compare, interchange.

## Known issues

- Leaked-password protection is off (owner toggle; security advisor WARN).
- *Production schema drift* **is failing (since 2026-10-13)**: production's
  `internal.timesheets_guard()` body no longer matches the committed
  fingerprint — someone edited that function in production outside a
  migration between 2026-10-12 15:50 and 10-13 00:52 (the fingerprint line
  has not changed since PR #81, so the repo did not move). Needs the owner
  to decide: restore production to the migration's version, or carry the
  production version in a new migration (`database-and-security.md` §3).
  The nightly check stays red on purpose until then — it is not noise.
  It logs in as `drift_reader` (catalog reads + bucket settings only;
  `tools-and-access.md` §7).
- Supabase free plan: "grace period is over" banner. Database 23 MB, storage
  46 kB, 20 users, ~200 requests/day — all well inside the limits, so the
  overage is something only the dashboard shows (likely egress or Realtime).
- `npm audit`: production deps clean; 7 high in dev tooling only (`braces`
  via Tailwind's watcher and `eslint-config-next`; fix needs upstream) —
  BACKLOG 3.1.
- Security advisor: `SECURITY DEFINER` RPCs callable by anon (9) and signed-in
  users (24 more) — the intended API, each gated, reviewed in
  `database-and-security.md` §2.D.

## Latest sessions

One note per PR, newest first, in [`sessions/`](sessions/README.md) — a Claude Code session prints the latest three at start. `STATE.md` itself changes only for the handoff (Resume here, Open work, Known issues), so PRs no longer collide on it.
