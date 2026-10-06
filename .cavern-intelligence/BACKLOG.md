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
- **Optional — branch protection on `main`** with `checks`, `database` and
  the `e2e-local` shards required. That turns on GitHub auto-merge, so a
  green PR merges itself instead of waiting for a session to notice.
- **Leaked-password protection** — Supabase dashboard › Auth › Passwords.
  Still flagged by the security advisor (`auth_leaked_password_protection`).
- **Old stashes on the Windows machine** (the one that made the island
  branch): `stash@{1}` and `stash@{2}`, from June–July, predate the rewrites
  and were never reconciled. Look at each (`git stash show -p stash@{n}`);
  anything not on `main` goes into a branch, then drop them. (The cloud
  container's only stash, "legal", is fully on `main` — checked line by line.)
- **Delete 18 stale remote branches** (approved 2026-10-03; the session's
  GitHub proxy can't delete branches, so it's a one-liner from your machine:
  `git push origin --delete <names…>`, or GitHub › Branches). Audited: 14
  are ancestors of `main` (merged with merge commits), 3 were squash-merged
  with identical content (#96 `design-scales`, #111 `studio-tab-scroll`,
  #39 `repo-technical-audit`), and #41 `repo-reacquaintance` was closed on
  purpose (a dev quick-login + auth-bypass cookie — the local-stack e2e signs
  in for real instead). `staging` is an old July snapshot nothing in the repo
  refers to. Tips, to restore any (`git push origin <sha>:refs/heads/<name>`):
  - `chore/analyze-engine` `46b120c47485`
  - `chore/auth-journey-fix` `a4d30c6e078a`
  - `chore/fountain-conformance` `9afcc91c7dfc`
  - `chore/fountain-serializer` `0d610ed6fde7`
  - `chore/offline-foundation` `caa49daf8642`
  - `chore/production-hardening` `7d271728a063`
  - `chore/scheduler-and-deps` `01a7ba64894e`
  - `chore/scriptos-normalize` `cbef576b8cec`
  - `chore/suite-bridge` `8ba95ac8a4cc`
  - `chore/suite-completeness` `460b4379663e`
  - `chore/visibility-activity-consolidate` `f6da2b2bfe1e`
  - `claude/charming-galileo-fewe3n` `c2e71a8dc718`
  - `claude/design-scales` `21ffd98c81b2`
  - `claude/expand-access-autonomy-3ajtsg` `bab2c7f6a7cd`
  - `claude/repo-reacquaintance-q2bm6w` `9a61d35f911a`
  - `claude/repo-technical-audit-rj40tm` `717889d89184`
  - `claude/studio-tab-scroll` `f4c08f20425b`
  - `staging` `d42fb7b225d7`

## 2. To verify

- **`e2e/onset-offline.spec.ts` on Windows with the older local Chromium
  (1228)**: after an offline reload the day stays on "Loading the schedule…".
  Same on plain `main`, passes in CI and in the cloud container. Check on a
  second Windows machine / a newer Chromium before treating it as a bug.

## 3. Upgrades (scoped — in suggested order)

### 3.1 Dev-toolchain advisories — watch, S when upstream moves
Production dependencies: **0** vulnerabilities (`npm audit --omit=dev`,
2026-10-03, after `npm audit fix` bumped `dompurify`, `fflate`,
`brace-expansion`, `postcss-selector-parser` and the Next ESLint config).
Left: 7 high, all `braces` (every version flagged) reached only through dev
tools — `tailwindcss` → `chokidar`, and `eslint-config-next` → `fast-glob`.
Nothing ships to the browser or server; the only offered fix is
`--force` (breaking). Re-run `npm audit` when Tailwind or `eslint-config-next`
release; take the plain fix then. Done when `npm audit` reports 0.

### 3.2 Data access through `lib/` — L (incremental)
`conventions.md` §1 says components never call `supabase.from()` directly;
**110 calls** in `app/` and `components/` do. Move them into the typed
modules a page at a time (admin, jobs, lounge, crew, projects/[id], today,
call sheet, soundtrack, …), with the page's loading done the §10 way
(`useLoad` or a tagged state). Finish with a `no-restricted-syntax` lint rule
on `supabase.from` in `app/` and `components/` so it stays done. Done when
the rule is on with no exceptions.

### 3.5 Activity feed completeness — M (needs a product call)
`logActivity` (`lib/supabase/activity.ts`) is called for jobs, portfolio,
projects, scenes and wraps; not for media uploads, crew invites/role
changes, script revisions, call sheets issued or documents. Decide what the
feed should show (and to whom), then add the calls. Done when each chosen
event appears in the feed for the right audience (persona-tested).

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

### 3.12 Brand: the suite is **The Cavern** — M
Owner decision (2026-10-06): the product is **The Cavern**; **Misfits Cavern**
(with the s) is the company/media brand that makes it (`overview-and-goals.md`). ~30 places
in `app/`, `components/`, `lib/` say "Misfits Cavern" (titles, metadata,
landing copy, emails, legal pages, the manifest), plus the repo/package names
and docs. Part of the restructure pass.
Done when the UI, metadata and docs say The Cavern, and the company appears
only as the maker.

### 3.13 The Cavern on iPhone — installable app — M/L (owner: a must)
Owner decision (2026-10-06): an installable phone app, on iOS for sure. Two
routes, to decide together:
- **PWA first (M):** a web app manifest + icons + a service worker, so Safari's
  *Add to Home Screen* installs The Cavern full-screen with its own icon; iOS
  16.4+ gives installed web apps **push notifications** (call sheets, Lounge
  mentions, call-time reminders). Builds on Pocket (`lib/pocket`, the phone
  tab bar) and the on-set offline cache (`lib/studio/onset-offline.ts`). No
  App Store review, ships with every deploy.
- **App Store app (L):** the same web app in a native shell (Capacitor) for an
  App Store listing, native push and the camera/files pickers — needs an Apple
  Developer account ($99/yr), App Review, and a release process.
PWA first, App Store wrapper after, is the usual order. Done when The Cavern
installs on an iPhone, opens without browser chrome, works offline on set, and
a call sheet issued on the desk arrives as a notification on the phone.
