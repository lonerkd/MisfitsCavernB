# Misfits Cavern — Project State

> Injected into every session — keep it short: open work and the latest
> session only. Every open task, scoped: [BACKLOG.md](BACKLOG.md). Older
> sessions: [STATE-history.md](STATE-history.md).

## Open work — start here

Full scope for each in `BACKLOG.md`. In order:

1. **Owner, outside the code**: lawyer review of `/privacy` and `/terms`;
   leaked-password protection (Supabase › Auth › Passwords); the two old
   stashes on the Windows machine; 18 stale remote branches to delete
   (audited — all merged or closed on purpose; tips recorded).
2. **Verify** `e2e/onset-offline.spec.ts` on Windows with the older local
   Chromium (passes in CI and the cloud container).
3. **Upgrades**: data access through `lib/` (L) · lint
   pass 3 — the remaining suppressions (M) · activity feed completeness (M,
   product call) · emphasis in the writing surface (M) · story beat → script
   (M/L) · dev-toolchain advisories (watch upstream).

No PRs are open.

## Known issues

- Leaked-password protection is off (owner toggle; security advisor WARN).
- `npm audit`: production deps clean; 7 high in dev tooling only (`braces`
  via Tailwind's watcher and `eslint-config-next`; fix needs upstream) —
  BACKLOG 3.1.
- Security advisor: `SECURITY DEFINER` RPCs callable by anon (9) and signed-in
  users (23 more) — the intended API, each gated, reviewed in
  `database-and-security.md` §2.D.

## Latest Session — `has_discord_webhook` is gated

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

## Earlier — Definer-function review; README

No migration.

- **The definer-function allowlist** (`database-and-security.md` §2.D): all
  32 `SECURITY DEFINER` functions in `public` that anon (9) or signed-in
  users (23 more) can call, each with the check it makes, read from
  production. New ones join the list in the PR that adds them. One has no
  gate — `has_discord_webhook` answers for any channel to any signed-in user
  (a yes/no; ids are unguessable) — BACKLOG 3.11.
- **README** rewritten for what the suite is now (Next 16 / React 19, the
  local stack, the real `lib/` map, the knowledge hub); the dated audits in
  `docs/` are marked as historical snapshots.

