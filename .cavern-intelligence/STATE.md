# The Cavern — Project State

> Injected into every session — keep it short: open work and the latest
> session only. Every open task, scoped: [BACKLOG.md](BACKLOG.md). Older
> sessions: [STATE-history.md](STATE-history.md).

## Resume here (handoff, 2026-10-06 — cloud → local)

1. **Merged** 2026-10-06: #136, #135, #138, #139, #140 (restructure phases
   1–2: The Cavern, the R13 mark and icons, the 3D landing hero; live). This
   branch's PR: 3.3, script share links. **After it merges, apply
   `20261006000000_script_share_links.sql` to production** (Supabase SQL
   editor or MCP `apply_migration`), then run *Production schema drift*.
2. **Local setup check**: `npm ci`; `.claude/skills/` has three real
   skills (`run-misfits-cavern`, `supabase`,
   `supabase-postgres-best-practices`) — no symlinks, so they load on
   Windows. Session context loads from `CLAUDE.md` (it `@`-imports
   `RULES.md` + `STATE.md`) — no hook.
3. **Next**: 3.4 (password recovery). Then restructure phase 3 (splash
   images, Add to Home Screen coaching, Web Push — 3.13).
4. **Branches and stashes**: delete the 18 stale remote branches with the
   one-liner in BACKLOG §1 (all verified; the cloud proxy can't delete
   branches). On the Windows machine, check `git stash list` — two old
   stashes were never reconciled (BACKLOG §1).
5. Decided: the internal `mc_` / `mc-` prefixes stay. Still open with the
   owner: the domain. An installed iPhone app keeps its old icon until it
   is removed and added to the Home Screen again (iOS caches it).

## Open work — start here

Full scope for each in `BACKLOG.md`. The whole suite, top to bottom:
[`bible/`](bible/README.md). In order:

1. **Owner, outside the code** (owner, 2026-10-06: "good for now" — not
   blocking the next PRs; revisit before launch): Supabase usage (grace period over — which
   line?); an email sender (SMTP);
   lawyer review of `/privacy` and `/terms`; leaked-password protection; the
   two old Windows stashes; 18 stale remote branches (one-liner in BACKLOG §1); optionally branch
   protection on `main`.
2. **Restructure** — `restructure-proposal.md`: phases 1–2 done (clean-up;
   The Cavern with the R13 mark and icons). Next: 3 iPhone install (splash,
   coaching, push), 4 shell/primitives, 5 route groups, 6 one permission
   model, 7 thin pages, 8 optional Studio routes. No repo rename (new repo
   at launch, 3.16). Still open: the domain.
3. **Launch blocker**: password recovery (3.4).
4. **Small fixes**: phone editor footer and Lounge width (3.6) · one SELECT
   policy on `jobs` (3.9) · remove the unused permission model (3.10) · share
   page previews + e2e (3.11).
5. **Upgrades**: data access through `lib/` (3.2, L) ·
   iPhone app (3.13) · admin catalogues + moderation (3.14) · email (3.15) ·
   activity feed (3.5, product call) · emphasis (3.7) · beat → script (3.8) ·
   dev-toolchain advisories (3.1, watch upstream).
6. **Verify** `e2e/onset-offline.spec.ts` on Windows with the older local
   Chromium.

## Known issues

- Leaked-password protection is off (owner toggle; security advisor WARN).
- *Production schema drift* runs nightly and passes (2026-10-06: production
  matches the snapshot). It logs in as `drift_reader` (catalog reads +
  bucket settings only; `tools-and-access.md` §7).
- Supabase free plan: "grace period is over" banner. Database 23 MB, storage
  46 kB, 20 users, ~200 requests/day — all well inside the limits, so the
  overage is something only the dashboard shows (likely egress or Realtime).
- `npm audit`: production deps clean; 7 high in dev tooling only (`braces`
  via Tailwind's watcher and `eslint-config-next`; fix needs upstream) —
  BACKLOG 3.1.
- Security advisor: `SECURITY DEFINER` RPCs callable by anon (9) and signed-in
  users (24 more) — the intended API, each gated, reviewed in
  `database-and-security.md` §2.D.

## Latest Session — Script share links: the token is the only way in (3.3)

Migration `20261006000000_script_share_links.sql` — **apply to production
after merge**.

- **The leak, closed**: the anon policy "Shared scripts publicly viewable"
  (`using (shared = true)`) and the same arm in "scripts view" let anyone
  list every shared script without its link. Both arms are gone; a link
  resolves only through `get_shared_script(token)` (definer: the exact
  token while `shared`; the words and the author's public profile). In
  production 0 of 41 scripts were shared, so nothing was exposed.
- **Who shares**: `internal.scripts_share_guard` (trigger) — only the
  owner, or a project script's shapers, may change `shared` or
  `share_token`; tokens under 24 characters are refused. A new token is a
  revoke. Viewers still edit the words.
- **`/s/[token]`** is server-rendered through the public client: link
  previews (title, writer), never indexed, no cache — off or a new link
  closes it at once.
- **The editor's Share** (`components/editor/ShareScriptButton.tsx`,
  `lib/scriptos/share.ts`): link on/off, copy, new link (confirmed);
  shown to whoever the database lets share; every save checks its error.
- **Pitch board** says "This is public" (blocks are readable by everyone
  by design); its copy-link checks for failure.
- Tests: `tests/integration/script-share.test.ts` (11, failed 9 before the
  migration — the leak reproduced); `privacy.test.ts` updated (it asserted
  the leak); `e2e/script-share.spec.ts` (on, read signed out, new link,
  off); `lib/scriptos/share.test.ts`. Docs: `database-and-security.md` §C
  and the §2.D allowlist, bible 04/08/11, BACKLOG 3.3 removed, 3.11
  narrowed to `/p` and `/m`.
- Verified: typecheck, lint, unit tests, integration (all files), build,
  drift snapshot and types regenerated; e2e: script-share, accessibility,
  route-smoke, legal, writing-loop.

## Earlier — Restructure phases 1–2: clean-up and The Cavern

No migration.

- **Brand**: the product is **The Cavern** everywhere it's named — titles
  and metadata, the manifest (`name` The Cavern, `short_name` Cavern), the
  service worker, share and press pages, Discord sender, Spotify player,
  export filename, legal (`LEGAL.product` The Cavern, `LEGAL.maker` Misfits
  Cavern; effective date moved to 6 October), README, package name
  `the-cavern`, doc headings. Misfits Cavern stays only as the maker:
  the landing tag reads "The Cavern", the hero is the mark in 3D
  (`Mark3D`: three.js loaded after the page, lit by its own moon, turns
  with the pointer or a drag; the flat mark is the fallback), "by Misfits
  Cavern" under it (owner's call, revising "THE CAVERN" as a wordmark);
  the footer reads "The Cavern · by Misfits Cavern ·
  © 2026 Peter Olowude". "Welcome back, misfit." and the `mc_`/`mc-`
  prefixes stay.
- **The mark in the app**: `components/brand/Mark.tsx` (R13 in theme
  tokens) replaces the "MC" text in the nav, Studio, projects, jobs,
  Lounge and portfolio headers. `public/` gets the R13 icons
  (`icon.svg`, `favicon-32.png`, `apple-touch-icon.png`, 192/512 and
  maskable PNGs); `app/layout.tsx` declares them; the service worker cache
  is `mc-shell-v3` so installed apps refresh.
- **Clean-up**: deleted `hooks/useColorExtractor.ts` and
  `components/ui/AmbientGradient.tsx` (unused); `types/screenplay.ts` →
  `lib/scriptos/types.ts` (17 imports); `docs/` → `.cavern-intelligence/archive/`;
  dead `tsconfig` aliases (`@/types`, `@/hooks`, `@/utils`, `@/styles`)
  removed; CI's docs-only filter no longer lists `docs/`.
- Docs: bible gaps closed (01, 03, 05, 08, 10), `restructure-proposal.md`
  phases 1–2 marked done, `brand/README.md` says how the icons get into
  `public/`; BACKLOG 3.12 done and removed, 3.13 narrowed.
- The landing tagline was drawn at 45% opacity (2.3:1); now `--fg-dim` at
  full opacity (the 4.5:1 floor) — axe caught it once the hero loaded later.
- Verified: typecheck, lint, unit tests (479, 7 new for the 3D mark's
  geometry), build, budget (36 pages; `/` 291 kB — three.js isn't in the
  first load); the landing (at rest, hovered, dragged) and showcase looked
  at on desktop and phone.
