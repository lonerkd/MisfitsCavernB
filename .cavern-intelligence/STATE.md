# The Cavern — Project State

> Injected into every session — keep it short: open work and the latest
> session only. Every open task, scoped: [BACKLOG.md](BACKLOG.md). Older
> sessions: [STATE-history.md](STATE-history.md).

## Resume here (handoff, 2026-10-15)

1. **`main` is current.** Start with `git switch main && git pull`; then `node scripts/latest-sessions.js` for what the last PRs did, and `gh pr list` for what is open.
2. **Production matches `main`** (2026-10-25: schema drift green). Previews run on the staging project `cavern-staging` (ADR 0006); each merged migration goes to production, then staging (`database-and-security.md` §3).
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

1. **Owner, outside the code** (owner: "good for now" — revisit before
   launch): the SMTP sender and redirect allow-list (above), Supabase usage
   (grace period over — which line?), lawyer review of `/privacy`, `/terms`
   and `LICENSE`, leaked-password protection, the two old Windows stashes,
   branch protection on `main` (`pr-title`, `checks`, `database` required),
   signed commits, the first `v*` tag, the domain.
2. **Owner, one decision — the migration path** (2026-10-27): production
   migrations are still pasted by hand because the only production credential
   CI has is the read-only `drift_reader`. Either `supabase db push --linked`
   from your machine, or a `migrate-production.yml` (workflow_dispatch) with a
   write-capable role. Until then every schema task below waits, and the
   code-only work carries on around it.
3. **Next code work**: restructure
   phases 7–8 (`restructure-proposal.md`: thin pages, optional Studio
   routes); admin catalogues + moderation (3.14); email (3.15);
   activity feed (3.5, product call); dev-toolchain advisories
   (3.1, watch upstream). Editor: 3.34 (snippet triggers — needs a migration;
   block selection, multi-cursor) and 3.35 (version compare's rest).
4. **Verify** `e2e/onset-offline.spec.ts` on Windows with the older local
   Chromium; and in a browser, the 2026-10-27 editor work (go-to, jump history,
   selection actions, Compare versions) — unit/jsdom-tested, never watched.
5. **Wishlist** (owner, 2026-10-07): ranked and scoped in
   `wishlist-ranking.md`. Started 2026-10-27: 4.7's slice 1 is built and
   **version compare (4.12) is in** — any two drafts, scene by scene. Next by
   the ranking: the island's live activities (4.1), money (4.6), then the rest
   of compare (side by side, review mode, change report).

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
