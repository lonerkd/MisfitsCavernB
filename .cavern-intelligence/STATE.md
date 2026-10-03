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
3. **Upgrades**: dependency security fixes (S) · data access through `lib/`
   (L) · hook tests (S/M) · lint pass 3 — the remaining suppressions (M) ·
   activity feed completeness (M, product call) · one scheduler (S) ·
   emphasis in the writing surface (M) · story beat → script (M/L) ·
   definer-function allowlist (S) · README refresh (S).

No PRs are open.

## Known issues

- Leaked-password protection is off (owner toggle; security advisor WARN).
- `npm audit`: 2 moderate in production deps (`dompurify`, `fflate`; plain
  `npm audit fix`), 11 counting dev tooling — BACKLOG 3.1.
- Security advisor: `SECURITY DEFINER` RPCs callable by anon (9) and signed-in
  users (33) — intended API, each gated inside; allowlist to write (3.9).

## Latest Session — Lint pass 2: every React Compiler rule is an error; the knowledge hub audited

No migration.

- **Lint pass 2 done (#120 + this PR).** 121 → 0 warnings; `refs`,
  `preserve-manual-memoization` and `set-state-in-effect` are errors, like
  the rest. The patterns — and the small hooks added for them — are in
  `conventions.md` §10: `useOnChange` (state that follows a value),
  `useLoad` (data for a key, stale answers dropped), `useDeviceValue`
  (localStorage read while rendering), `useSearchParam` / `useHydrated`,
  `useMediaQuery`; state tagged with the key it answers (`{ projectId, rows }`)
  so "loading" is derived; loaders set state only in promise callbacks.
- **Behaviour worth knowing**: `useLiveRows` (`lib/studio/live.ts`) now tags
  its rows with their scope (no reset in the effect); the Studio's tab is read
  from the address (`?tab=&view=`) on every render, so links that change it
  while the Studio is open work; Studio scene sync reloads the *current*
  script's scenes (it could reload a previous script's before); the audit log
  search filters the loaded page instead of refetching per keystroke; the
  split screen renders only after hydration.
- **Knowledge hub audit**: older sessions moved to `STATE-history.md`; one
  scoped backlog (`BACKLOG.md`) built by checking every deferred item in the
  history against the code, production and the advisors — resolved ones
  dropped (strict TS, realtime publication, bucket listing, anon
  `has_discord_webhook`, private-project crew reads, unused deps); the
  session hook now injects the whole of STATE.md.
- Validated: types, lint (0 problems), 452 unit tests, build, page-weight
  budget, and the full e2e suite on the local stack (72/73 first run; the
  phone share-to-Capture case missed a share already in the address at
  mount — fixed, and `mobile.spec` re-run 4/4).
- **Stashes and branches**: the cloud container's "legal" stash is fully on
  `main` (checked line by line). The unmerged remote branches are all merged
  (squash) or deliberately closed — listed for deletion in BACKLOG §1.
