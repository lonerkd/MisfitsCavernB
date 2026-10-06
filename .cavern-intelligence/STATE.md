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
   stashes on the Windows machine; 18 stale remote branches to delete
   (audited — all merged or closed on purpose; tips recorded); optionally
   branch protection on `main` (enables auto-merge).
2. **Verify** `e2e/onset-offline.spec.ts` on Windows with the older local
   Chromium (passes in CI and the cloud container).
3. **Upgrades**: data access through `lib/` (L) · activity feed
   completeness (M, product call) · emphasis in the writing surface (M) ·
   story beat → script (M/L) · dev-toolchain advisories (watch upstream).

No PRs are open.

## Known issues

- Leaked-password protection is off (owner toggle; security advisor WARN).
- *Production schema drift*: not passing yet — it logs in as `drift_reader`
  with the `PRODUCTION_DB_PASSWORD` secret (owner sets it;
  `tools-and-access.md` §7). The first secret (a pasted connection string)
  arrived broken.
- Supabase free plan: "grace period is over" banner. Database 23 MB, storage
  46 kB, 20 users, ~200 requests/day — all well inside the limits, so the
  overage is something only the dashboard shows (likely egress or Realtime).
- `npm audit`: production deps clean; 7 high in dev tooling only (`braces`
  via Tailwind's watcher and `eslint-config-next`; fix needs upstream) —
  BACKLOG 3.1.
- Security advisor: `SECURITY DEFINER` RPCs callable by anon (9) and signed-in
  users (23 more) — the intended API, each gated, reviewed in
  `database-and-security.md` §2.D.

## Latest Session — Lint pass 3: no hidden dependencies

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

## Earlier — `has_discord_webhook` is gated

Migration `20261004010000_discord_webhook_gate.sql` (applied to production;
fingerprint checked).

- The definer-function review found one function without a check:
  `has_discord_webhook(cid)` told any signed-in user whether any channel had
  a Discord webhook. It now answers only for someone who can manage the
  channel (`can_manage_channel`) — the people who set or remove the webhook,
  and the only caller (the channel-manage dialog). Same signature and
  grants; only the body changed (one fingerprint line).
- `tests/integration/discord-webhook.test.ts`: the owner sees true; crew who
  can't manage the channel and an outsider see false. Full integration
  suite: 289 pass.
