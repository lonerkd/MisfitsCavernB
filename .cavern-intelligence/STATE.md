# The Cavern — Project State

> Injected into every session — keep it short: open work and the latest
> session only. Every open task, scoped: [BACKLOG.md](BACKLOG.md). Older
> sessions: [STATE-history.md](STATE-history.md).

## Open work — start here

Full scope for each in `BACKLOG.md`. The whole suite, top to bottom:
[`bible/`](bible/README.md). In order:

1. **Owner, outside the code**: Supabase usage (grace period over — which
   line?); count shared scripts in production (3.3); an email sender (SMTP);
   lawyer review of `/privacy` and `/terms`; leaked-password protection; the
   two old Windows stashes; 18 stale remote branches; optionally branch
   protection on `main`.
2. **Restructure** — `restructure-proposal.md` (8 phases: clean-up, brand,
   iPhone install, shell/primitives, route groups, one permission model,
   thin pages, optional Studio routes) waits on the owner's sign-off and
   7 decisions (the mark, voice, hero, repo name, prefixes, domain,
   agent leftovers). Nothing has moved.
3. **Security and launch blockers**: script share links token-gated (3.3) ·
   password recovery (3.4).
4. **Small fixes**: phone editor footer and Lounge width (3.6) · one SELECT
   policy on `jobs` (3.9) · remove the unused permission model (3.10) · share
   page previews + e2e (3.11).
5. **Upgrades**: data access through `lib/` (3.2, L) · brand rename (3.12) ·
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

## Latest Session — The bible: the whole suite, top to bottom

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
- Naming: The Cavern is the product, Misfits Cavern the company
  (`overview-and-goals.md`); the rename is 3.12.

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

