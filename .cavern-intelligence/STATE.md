# Misfits Cavern — Project State

> Injected into every session — keep it short: open work and the latest
> session only. Every open task, scoped: [BACKLOG.md](BACKLOG.md). Older
> sessions: [STATE-history.md](STATE-history.md).

## Open work — start here

Full scope for each in `BACKLOG.md`. In order:

1. **Owner, outside the code**: lawyer review of `/privacy` and `/terms`;
   leaked-password protection (Supabase › Auth › Passwords); the two old
   stashes on the Windows machine; four stale remote branches to delete.
2. **Verify** `e2e/onset-offline.spec.ts` on Windows with the older local
   Chromium (passes in CI and the cloud container).
3. **Upgrades**: data access through `lib/` (L) · lint
   pass 3 — the remaining suppressions (M) · activity feed completeness (M,
   product call) · emphasis in the writing surface (M) · story beat → script
   (M/L) · definer-function allowlist (S) · README refresh (S) · dev-toolchain
   advisories (watch upstream).

No PRs are open.

## Known issues

- Leaked-password protection is off (owner toggle; security advisor WARN).
- `npm audit`: production deps clean; 7 high in dev tooling only (`braces`
  via Tailwind's watcher and `eslint-config-next`; fix needs upstream) —
  BACKLOG 3.1.
- Security advisor: `SECURITY DEFINER` RPCs callable by anon (9) and signed-in
  users (33) — intended API, each gated inside; allowlist to write (3.9).

## Latest Session — Hook tests

No migration.

- **The shared hooks have unit tests** (28, in a jsdom environment):
  `useOnChange`, `useLoad`, `useDeviceValue`, `useSearchParam` /
  `useHydrated`, `useMediaQuery` (`lib/hooks/*.test.tsx`), `useLiveRows`
  (`lib/studio/live.test.tsx`) and `useOnSetSync`
  (`lib/studio/useOnSetSync.test.tsx`). They pin down what the lint-pass-2
  rework relies on: a key switch never shows the previous key's data, a late
  answer for an old key is dropped, a reload can't erase a local write,
  newer `updated_at` wins, the offline queue is counted per project and sent
  in order when the connection is back.
- How: `@testing-library/react` + `jsdom` (dev deps); a test file opts in
  with `// @vitest-environment jsdom` and is named `*.test.tsx`
  (`vitest.config.ts` includes them). Vitest runs without globals, so each
  file calls `afterEach(cleanup)` — without it, hooks from earlier tests stay
  mounted and react to later events.
- 472 unit tests in all.

## Earlier — Dependency fixes; one scheduler

No migration.

- **`npm audit fix`** (patch bumps only: `dompurify`, `fflate`,
  `brace-expansion`, `postcss-selector-parser`, the Next ESLint config):
  production dependencies report **0** vulnerabilities. Left: 7 high in dev
  tooling only (`braces`, via Tailwind's file watcher and
  `eslint-config-next`), fixable only with breaking `--force` — watched in
  BACKLOG 3.1.
- **One scheduler**: deleted `lib/scriptos/schedule.ts`
  (`generateShootingSchedule`) and its test. It worked from the parsed
  screenplay text; its Studio card went with the Studio rebuild, once scenes
  synced themselves into the scene index. Auto-schedule is
  `packShootDays` (`lib/studio/shoot-days.ts`, tested); the stripboard
  header, Locations and Scenes show the totals the card did.
