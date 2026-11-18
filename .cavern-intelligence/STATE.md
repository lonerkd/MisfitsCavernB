# The Cavern — Project State

> Injected into every session — keep it short: open work and the latest
> session only. Every open task, scoped: [BACKLOG.md](BACKLOG.md). Older
> sessions: [STATE-history.md](STATE-history.md).

## Resume here (handoff, 2026-11-17)

1. **`main` is current.** 2026-11-15 to 11-17 merged #579–#612 and #616 (each in `sessions/`; `node scripts/latest-sessions.js`). Start with `git switch main && git pull`. Open PRs belong to other sessions (#539, #540, #615).
2. **Production and staging match `main`** through `20261117000100` (`entities` in the Realtime publication, applied by its session; before it, redacted error stacks, report outcomes, project logo, share format, private Realtime, brief-question admin); the drift check is green after each. **Apply a migration from its file exactly as written** (a stripped blank line changes the body hash and fails drift).
2a. **Every Realtime channel is private** (the owner turned "Allow public access" off on 2026-11-16): a new `supabase.channel(...)` must pass `private: true` and get a topic rule in `realtime.messages`, or it will not open (`database-and-security.md` §2.E).
2b. **The budget** (RULES 9): Vercel Hobby hit 100 deploys/day on 2026-11-15 from many parallel PRs. Keep 2–3 PRs open, one push per PR, update a branch only right before it merges.
3. **The work is the backlog.** Open tasks are in [BACKLOG.md](BACKLOG.md), nothing else: the owner's own list (§1: SMTP sender and the redirect list, leaked-password protection, the throwaway QA accounts, GitGuardian, Supabase usage, lawyer review, old stashes), the checks only the owner can do (a real iPhone pass; scan a printed QR; Spotify Premium; the Cavern experience flown on a screen), and the scoped upgrades (§3).
4. **Built 2026-11-08** (each in `sessions/`): the production role tools on real per-record storage with crew writing, linked to scenes and characters, plus stills, extras, editorial handoff and insurance claims; the portfolio (header, covers, private by default, a person's page `/u/<name>`, credits, the directory with craft filter and sitemap, a share card, pin and reorder, festivals verified and self-reported, a one-sheet with a QR code); **print and export through one kit** (`lib/print/`: one layout, a Print / PDF and a CSV button on every tool that prints, no print pop-ups left); the Capture outbox and the call-sheet helper decided; the Props / Costume / Makeup / VFX overlap decided (they stay separate department tools).
5. **Local setup**: `npm ci`; `.claude/skills/` has three real skills (`run-misfits-cavern`, `supabase`, `supabase-postgres-best-practices`); context loads from `CLAUDE.md`. In a cloud container Docker dies between commands: start `dockerd` as a background task, `npm run db:start`, `npx supabase stop` first if it came up from stale containers. Preview first, then main: a change reaches `main` only through a PR from a `claude/*` branch (the `main-2` ruleset has no bypass, so it is enforced, not just asked); merge once the required checks are green (`conventional`, `checks`, `database`, `gate`; the branch up to date with `main`). A merge sometimes needs `main` merged in first. Vercel previews fail on the free plan's daily deploy limit when many PRs run in a day; that check is not required.
6. **Web Push is live in production** (2026-10-25): VAPID keys and `PUSH_DISPATCH_SECRET` in Vercel (Production), `internal.push_config` set. Staging has no push config (off, by design).
7. **Stats are real**: the public totals leave out sample, test and bot accounts. Still to do: delete the throwaway QA accounts (BACKLOG 3.37).
8. **Decided, do not reopen**: the internal `mc_` / `mc-` prefixes stay; open with the owner: the domain. An installed iPhone app keeps its old icon until re-added to the Home Screen (iOS caches it).


## Standing permissions (owner, 2026-11-08)

Claude may merge its own pull requests once the required checks are green (a pull request the risk bot rates high, or that declares a Large change, first gets the independent review RULES 11 asks for, 2026-11-18), and may apply its own migrations to production and then staging (then the drift check), without asking each time. Still ask first for anything destructive to live data, rotating keys, changing auth settings, or a design decision the owner has not made. (The head-bound `claude-review` approval and the `main-2` ruleset date from the cheaper-model days; `claude-review` is not a required check.)

## Direction (owner, 2026-10-10)

The suite becomes one connected core — **the film graph**: scenes, characters,
locations, shoot days, story days, elements, shots and people as real linked
rows, plus a universal layer so anything attaches to anything. Design:
[film-graph-spec.md](film-graph-spec.md) (approved; steps 1 (days and places → daylight), 2 (characters, who is in each scene, casting by id) and 3 (story time and continuity) are built; what is left is BACKLOG 3.18). This comes before the wishlist ranking.

## Open work

Only the backlog: [BACKLOG.md](BACKLOG.md) (the owner's list first, then the scoped upgrades in order; the film graph, [film-graph-spec.md](film-graph-spec.md), is 3.18). The whole suite, top to bottom: [`bible/`](bible/README.md). The wishlist ranking is `wishlist-ranking.md`.

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
