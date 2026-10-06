# The Cavern — Project State

> Injected into every session — keep it short: open work and the latest
> session only. Every open task, scoped: [BACKLOG.md](BACKLOG.md). Older
> sessions: [STATE-history.md](STATE-history.md).

## Resume here (handoff, 2026-10-06 — cloud → local)

1. **Merged** 2026-10-06: #136 (bible, audit, restructure plan, the R13
   mark, one source of rules), #135, #138, #139 (run driver stops by port).
   This branch's PR: restructure phases 1–2 (the clean-up and the brand).
   Start from `git switch main && git pull` once it's merged.
2. **Local setup check**: `npm ci`; `.claude/skills/` has three real
   skills (`run-misfits-cavern`, `supabase`,
   `supabase-postgres-best-practices`) — no symlinks, so they load on
   Windows. Session context loads from `CLAUDE.md` (it `@`-imports
   `RULES.md` + `STATE.md`) — no hook.
3. **Next**: 3.3 (script share links token-gated, security), then 3.4
   (password recovery). Then restructure phase 3 (splash images, Add to
   Home Screen coaching, Web Push — 3.13).
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
   line?); count shared scripts in production (3.3); an email sender (SMTP);
   lawyer review of `/privacy` and `/terms`; leaked-password protection; the
   two old Windows stashes; 18 stale remote branches (one-liner in BACKLOG §1); optionally branch
   protection on `main`.
2. **Restructure** — `restructure-proposal.md`: phases 1–2 done (clean-up;
   The Cavern with the R13 mark and icons). Next: 3 iPhone install (splash,
   coaching, push), 4 shell/primitives, 5 route groups, 6 one permission
   model, 7 thin pages, 8 optional Studio routes. No repo rename (new repo
   at launch, 3.16). Still open: the domain.
3. **Security and launch blockers**: script share links token-gated (3.3) ·
   password recovery (3.4).
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

## Latest Session — Restructure phases 1–2: clean-up and The Cavern

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
- Verified: typecheck, lint, unit tests (479, 7 new for the 3D mark's
  geometry), build, budget (36 pages; `/` 291 kB — three.js isn't in the
  first load); the landing (at rest, hovered, dragged) and showcase looked
  at on desktop and phone.

## Earlier — The bible: the whole suite, top to bottom

No migration. Docs and two scripts only.

- **`.cavern-intelligence/bible/`**: a front door (`README.md`: ecosystem
  map, the threads that tie it together, how to refresh), eleven chapters
  (shell; account; home, Today and projects; ScriptOS; Studio; Lounge and
  sound; the network; public pages; admin; platform systems; rulesets — the
  RLS permission matrix and phase gating), each with its screens, states,
  rules, connections and known gaps.
- **Generated**: `npm run bible` → `bible/inventory.md` (34 pages, 5 API
  routes, what each touches, tables → routes, functions, specs → routes);
  `npm run bible:shots` → 96 screenshots (desktop + phone) of every page on
  the demo world (local stack only).
- **Audit** (`bible/audit-2026-10-06.md`): shared scripts are readable
  without their link (3.3, security); no password recovery (3.4); two phone
  layout bugs (3.6); `jobs` double SELECT policy (3.9); an unused permission
  model (3.10); share pages without previews (3.11); no admin catalogues or
  moderation (3.14); no email (3.15). All in BACKLOG.
- **Docs that had drifted, corrected**: `scriptos-engine.md` (no worker, no
  `script_versions`: the real sync, conflict rule, offline queue and
  revisions), `routing-and-surface.md` (`/shared`, `/api/links`, `/m`; the
  data-layer claim), `database-and-security.md` (portfolios are public),
  `conventions.md` §5 (the hooks the UI really uses), the definer count (24).
- **`restructure-proposal.md`**: the plan for folders, logic and the brand,
  for sign-off. Found two dead files (`hooks/useColorExtractor.ts`,
  `components/ui/AmbientGradient.tsx`).
- Dependabot #135 (4 updates, approved) is green; the merge needs the owner
  (the session's merge was refused).
- **Brand**: five rounds of the mark with the owner (`brand/concepts/`,
  sheets by `node scripts/brand-sheet.mjs`); **R13 chosen** — Assiniboine
  and Rundle make the M, lit by the crescent C. `brand/mark/` holds the
  mark, a small cut and a one-colour version; `node scripts/brand-export.mjs`
  makes the iPhone, manifest and favicon icons. Owner decisions in
  `restructure-proposal.md`; launch-repository practice is 3.16.
- **One source of rules**: `.cavern-intelligence/RULES.md` replaces
  `AGENTS.md`'s hand-written rules, `CLAW.md`, `playbook.md` and
  `sync-protocol.md` (all drifted). `CLAUDE.md`, `AGENTS.md` and
  `.github/copilot-instructions.md` are generated from it by
  `npm run sync-intel`; CI's `checks` job fails if they drift. The
  SessionStart hook is gone (CLAUDE.md's imports replace it). `INDEX.md`
  is the map: one home per fact.
- **Skills restored**: `supabase` and `supabase-postgres-best-practices`
  were dangling links since July (`65bb696` deleted their files); now real
  folders in `.claude/skills/` with `skills-lock.json` (`tools-and-access.md` §4).
- **Old agent tooling removed**: `.harnesskit/` and `progress/` (a September
  harness; nothing referenced them).
- Naming: The Cavern is the product, Misfits Cavern the company
  (`overview-and-goals.md`); the rename is 3.12.
