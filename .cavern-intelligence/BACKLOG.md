# Misfits Cavern — Backlog

Every open task and planned pass, scoped. **This is the one list** — when work
is found and not done, it goes here (not only in a session note); when it's
done, delete it here and record it in `STATE.md`'s latest session. `STATE.md`
carries the short version ("Open work") and is injected into every session.

Sizes: **S** ≈ an hour or two · **M** ≈ a session · **L** ≈ several sessions.
Last audited: 2026-10-03 (each item checked against the code, production and
the advisors that day).

---

## 1. For the owner (outside the code)

- **Lawyer review** of `/privacy` and `/terms` (`lib/legal.ts`; Peter Olowude,
  Alberta, Canada).
- **Leaked-password protection** — Supabase dashboard › Auth › Passwords.
  Still flagged by the security advisor (`auth_leaked_password_protection`).
- **Old stashes on the Windows machine** (the one that made the island
  branch): `stash@{1}` and `stash@{2}`, from June–July, predate the rewrites
  and were never reconciled. Look at each (`git stash show -p stash@{n}`);
  anything not on `main` goes into a branch, then drop them. (The cloud
  container's only stash, "legal", is fully on `main` — checked line by line.)
- **Stale remote branches** — all merged or closed; safe to delete on GitHub:
  `claude/design-scales` (#96, merged), `claude/studio-tab-scroll` (#111,
  merged), `claude/repo-technical-audit-rj40tm` (#39, merged),
  `claude/repo-reacquaintance-q2bm6w` (#41, closed unmerged: a dev
  quick-login + middleware auth-bypass cookie; deliberately not taken — the
  local-stack e2e signs in for real instead).

## 2. To verify

- **`e2e/onset-offline.spec.ts` on Windows with the older local Chromium
  (1228)**: after an offline reload the day stays on "Loading the schedule…".
  Same on plain `main`, passes in CI and in the cloud container. Check on a
  second Windows machine / a newer Chromium before treating it as a bug.

## 3. Upgrades (scoped — in suggested order)

### 3.1 Dependency security — S
`npm audit` (2026-10-03): production deps have 2 moderate (`dompurify`
≤3.4.12, `fflate` 0.8.0–0.8.2), both fixable with plain `npm audit fix`.
With dev deps, 11 in all (8 high: `brace-expansion`, `braces`,
`postcss-selector-parser` via the lint/CSS toolchain). Run `npm audit fix`
(never `--force` without reading what it bumps), rebuild, full e2e. Done when
production deps report 0 and the dev highs are fixed or noted as
toolchain-only.

### 3.2 Data access through `lib/` — L (incremental)
`conventions.md` §1 says components never call `supabase.from()` directly;
**110 calls** in `app/` and `components/` do. Move them into the typed
modules a page at a time (admin, jobs, lounge, crew, projects/[id], today,
call sheet, soundtrack, …), with the page's loading done the §10 way
(`useLoad` or a tagged state). Finish with a `no-restricted-syntax` lint rule
on `supabase.from` in `app/` and `components/` so it stays done. Done when
the rule is on with no exceptions.

### 3.3 Hook tests — S/M
Vitest runs in `node` with no React test environment, so the shared hooks
(`lib/hooks/useLoad`, `useOnChange`, `useDeviceValue`, `useSearchParam`,
`useMediaQuery`, `lib/studio/live.ts` `useLiveRows`, `useOnSetSync`) are
covered only through e2e. Add `@testing-library/react` + a `jsdom` test
project for `lib/hooks/**` and `lib/studio/live*`. Done when each hook has a
test for its key-switch / stale-answer behaviour.

### 3.4 Lint pass 3 — M
The React Compiler rules are all errors now. What's left suppressed:
20 `react-hooks/exhaustive-deps` disables (each one hides a dependency that
should be an effect event or a derived key) and 22 `@next/next/no-img-element`
(decide per image: `next/image`, or keep `<img>` with a reason for
user-uploaded / signed URLs). 2 `set-state-in-effect` disables are justified
(Lounge message highlight, phase reveal). Done when every remaining disable
carries a `-- reason`.

### 3.5 Activity feed completeness — M (needs a product call)
`logActivity` (`lib/supabase/activity.ts`) is called for jobs, portfolio,
projects, scenes and wraps; not for media uploads, crew invites/role
changes, script revisions, call sheets issued or documents. Decide what the
feed should show (and to whom), then add the calls. Done when each chosen
event appears in the feed for the right audience (persona-tested).

### 3.6 One scheduler — S
`lib/scriptos/schedule.ts` (`generateShootingSchedule`) is used only by its
own test; the Auto-schedule button lives in
`components/studio/production/StripboardView.tsx`. Wire the lib in or delete
it (and its test). Done when there is one implementation.

### 3.7 Emphasis in the writing surface — M
Fountain emphasis (`*italic*`, `**bold**`, `_underline_`) is honoured in
export (`lib/scriptos/export.ts`, `fountain-export.ts`) but shows as raw
markers while writing (`components/editor/WriteView.tsx`). Render it in the
write surface without breaking caret/selection. Done when the editor e2e
types emphasis and sees it styled, and export is unchanged.

### 3.8 Story beat → script — M/L
"Push beat to ScriptOS" was removed: it created a new script per beat. The
safe version appends a beat to the project's script with a server-side merge
that can't clobber unsynced editor edits (`lib/scriptos/sync.ts` has the
outbox). Done when a beat lands in the open script for a co-writer without
losing either side's edits (two-session test).

### 3.9 Definer-function review — S
The security advisor lists 9 anon-callable and 33 signed-in-callable
`SECURITY DEFINER` RPCs (WARN). They are the intended API (share tokens,
showcase, error reporting, account, Lounge, call sheets…), each gated inside.
Record the allowlist with each function's gate in
`database-and-security.md`, so a new definer function is a reviewed
addition. Done when the list matches the advisor's.

### 3.10 README and public docs — S
A partial branding pass was done; `README.md` and `docs/` still describe some
older states (e.g. `docs/STATE_ASSESSMENT_2026-09.md` lists issues that are
all fixed now — the bucket and `has_discord_webhook` advisor findings are
gone). Refresh the README's feature list and setup (local stack:
`bash scripts/dev-stack.sh`), and mark old assessments as historical.
