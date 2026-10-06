# The Cavern — Backlog

Every open task and planned pass, scoped. **This is the one list** — when work
is found and not done, it goes here (not only in a session note); when it's
done, delete it here and record it in `STATE.md`'s latest session. `STATE.md`
carries the short version ("Open work") and is injected into every session.

Sizes: **S** ≈ an hour or two · **M** ≈ a session · **L** ≈ several sessions.
Last audited: 2026-10-06 (each item checked against the code, production, the
advisors and every screen that day — `bible/audit-2026-10-06.md`).

---

## 1. For the owner (outside the code)

- **Supabase usage** — the dashboard says the free-plan grace period is over
  (Organization › Usage: which line is over — likely egress or Realtime; the
  database, storage and request counts are well inside). Decide: trim it, or
  move to Pro (also brings daily backups).
- **Count shared scripts in production** before 3.3 ships:
  `select count(*) from scripts where shared` (SQL editor) — they're readable
  without their link today.
- **Email sender** — a custom SMTP provider (Resend, Postmark…) in Supabase ›
  Auth › SMTP, on a domain you own, before strangers sign up (3.15).
- **Lawyer review** of `/privacy` and `/terms` (`lib/legal.ts`; Peter Olowude,
  Alberta, Canada).
- **Optional — branch protection on `main`** with `checks`, `database` and
  the `e2e-local` shards required. That turns on GitHub auto-merge, so a
  green PR merges itself instead of waiting for a session to notice.
- **Leaked-password protection** — Supabase dashboard › Auth › Passwords.
  Still flagged by the security advisor (`auth_leaked_password_protection`).
- **Stashes**: the cloud container's ("legal") is dropped — every line was
  already on `main` (re-checked 2026-10-06). **Old stashes on the Windows machine** (the one that made the island
  branch): `stash@{1}` and `stash@{2}`, from June–July, predate the rewrites
  and were never reconciled. Look at each (`git stash show -p stash@{n}`);
  anything not on `main` goes into a branch, then drop them. (The cloud
  container's only stash, "legal", is fully on `main` — checked line by line.)
- **Delete 18 stale remote branches** (re-verified 2026-10-06; the cloud
  session's GitHub proxy can't delete branches — run from your machine once
  the driver-fix PR is merged):

  ```
  git push origin --delete chore/analyze-engine chore/auth-journey-fix chore/fountain-conformance chore/fountain-serializer chore/offline-foundation chore/production-hardening chore/scheduler-and-deps chore/scriptos-normalize chore/suite-bridge chore/suite-completeness chore/visibility-activity-consolidate claude/charming-galileo-fewe3n claude/expand-access-autonomy-3ajtsg staging claude/repo-technical-audit-rj40tm claude/studio-tab-scroll claude/design-scales claude/repo-reacquaintance-q2bm6w
  ```

  What each is: 14 are ancestors of `main` (all 11 `chore/*`,
  `charming-galileo`, `expand-access-autonomy`, `staging`); `repo-technical-audit`
  is byte-identical to what #39 merged (`d42fb7b`); `studio-tab-scroll` is
  identical to #111's squash; `design-scales` was identical to #96's squash
  until a local session pushed one more commit on 2026-10-06 (`292d2b7`, the
  run-driver stop-by-port fix) — ported to `main` in its own PR, the rest of
  that commit only touched the deleted `.harnesskit/`; `repo-reacquaintance`
  was #41, closed on purpose (a dev quick-login + auth-bypass cookie — never
  ship it). Tips, to restore any (`git push origin <sha>:refs/heads/<name>`):
  `chore/analyze-engine` `46b120c47485` · `chore/auth-journey-fix` `a4d30c6e078a` ·
  `chore/fountain-conformance` `9afcc91c7dfc` · `chore/fountain-serializer` `0d610ed6fde7` ·
  `chore/offline-foundation` `caa49daf8642` · `chore/production-hardening` `7d271728a063` ·
  `chore/scheduler-and-deps` `01a7ba64894e` · `chore/scriptos-normalize` `cbef576b8cec` ·
  `chore/suite-bridge` `8ba95ac8a4cc` · `chore/suite-completeness` `460b4379663e` ·
  `chore/visibility-activity-consolidate` `f6da2b2bfe1e` · `claude/charming-galileo-fewe3n` `c2e71a8dc718` ·
  `claude/expand-access-autonomy-3ajtsg` `bab2c7f6a7cd` · `staging` `d42fb7b225d7` ·
  `claude/repo-technical-audit-rj40tm` `717889d89184` · `claude/studio-tab-scroll` `f4c08f20425b` ·
  `claude/design-scales` `292d2b71b129` · `claude/repo-reacquaintance-q2bm6w` `9a61d35f911a`.
  (The working branch `claude/state-assessment-testing-r0tf3y` stays — it's
  the session branch.)

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

### 3.3 Script share links: token-gated, and a way to share — S/M (security first)
The anon policy `scripts."Shared scripts publicly viewable"` is
`using (shared = true)` and the signed-in `scripts view` policy has the same
arm, so every shared script is readable without its link — the token
protects nothing. Replace both arms with a definer
`get_shared_script(p_token)` (exact `share_token`, `shared = true`; returns
title, content, updated_at, the author's public profile) like
`get_shared_project`; `/s/[token]` reads through it, server-rendered with Open
Graph metadata. Then finish the feature: a Share control in the editor
(owner/shapers; on/off, copy link, revoke = new token). Persona tests: anon
and an outsider can't list shared scripts, can read one by token, can't after
revoke. Also: pitch-board blocks are public by design — label the board "This
is public". Done when the tests pass and the editor can share and revoke.

### 3.4 Password recovery — S (launch blocker)
No "forgot password" anywhere: no `resetPasswordForEmail`, no recovery page.
Add "Forgot password?" on `/auth` (sends the reset email; same answer whether
or not the address exists) and a recovery landing that sets a new password
(strength meter, leaked check) via `updateUser`. e2e on the local stack
(the local mail catcher). Done when a user can reset a forgotten password end to end.

### 3.6 Phone layout fixes from the screens — S
From `bible/screens/` (390 wide): the editor footer's label overlaps the
script title (`editor--phone`); the Lounge header is cut off and a dark strip
shows down the right — something is wider than the screen (`lounge--phone`).
Fix both; add the two routes to `e2e/mobile.spec.ts`'s no-sideways-scroll
check. Done when the retaken shots are clean and the spec passes.

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

### 3.9 One SELECT policy on `jobs` — S
The performance advisor flags `multiple_permissive_policies` on `jobs` (two
permissive SELECT policies run on every read). Merge them into one policy with
the same meaning (`internal.job_listed` + the poster + applicants via
`internal.applied_to`); migration + fingerprint + the hiring/sample-data
persona tests unchanged. Done when the advisor no longer lists `jobs`.

### 3.10 Remove the unused permission model — S (restructure)
`lib/os/permissions.ts` and `access-matrix.ts` (global roles admin /
project_creator / crew_member / guest; every non-admin is `project_creator`)
and the hooks `usePermission`, `usePageAccess`, `useActionAccess`,
`useProjectAccess` have no callers in `app/` or `components/` (only
`lib/os/actions.ts` calls `hasPermission`). The UI uses `isOwner` /
`useCanShape`. Delete them (or rebuild one `useProjectRole` that mirrors the
RLS matrix in `bible/11-rules.md`) and keep their tests' useful cases. Done
when nothing describes permissions except RLS and that one hook.

### 3.11 Share pages: previews and e2e — S/M
`/p/[token]` and `/s/[token]` render on the client, so a pasted link shows no
title or image (`/shared` has Open Graph). Server-render both with
`generateMetadata` through the public client. Add e2e that opens `/s/[token]`
(none today) and `/m/[id]` signed out. Done when both pages unfurl in a chat
and the specs pass.

### 3.13 The Cavern on iPhone — installable app — M/L (owner: a must)
Owner decision (2026-10-06): an installable phone app, on iOS for sure. Two
routes, to decide together:
- **PWA first (M):** much is already there — `public/manifest.webmanifest`
  (standalone, starts at `/today`), `public/sw.js` (offline shell),
  `appleWebApp` metadata, the R13 icons (180 px touch icon, 192/512 and
  maskable manifest PNGs), the name, Pocket and the on-set offline cache.
  Missing for iPhone: splash images, "Share → Add to Home Screen" coaching
  (iOS has no install prompt), and **Web Push** (iOS 16.4+,
  installed web apps only; needs VAPID keys, a `push_subscriptions` table and
  a sender — an Edge Function — for call sheets, DMs and mentions). iOS
  ignores manifest shortcuts and `share_target`. No App Store review; ships
  with every deploy.
- **App Store app (L):** the same web app in a native shell (Capacitor) for an
  App Store listing, native push and the camera/files pickers — needs an Apple
  Developer account ($99/yr), App Review, and a release process.
PWA first, App Store wrapper after, is the usual order. Done when The Cavern
installs on an iPhone, opens without browser chrome, works offline on set, and
a call sheet issued on the desk arrives as a notification on the phone.
An App Store listing with Discord sign-in also needs **Sign in with Apple**.

### 3.14 Admin catalogues and moderation — M (product call)
Crafts, project formats, brief questions and channel presets are admin data
with no screens (changed by migration). Add `/admin/catalogue` (CRUD under the
existing admin-write policies). And before the network opens to strangers:
report a message / job / profile, an admin queue, hide and suspend. Done when
the owner can add a craft without a deploy, and a report reaches the queue.

### 3.15 Email — M
Notifications are in-app only; auth mail uses Supabase's default sender (low
hourly limit). With a custom SMTP sender (owner, §1): branded auth emails
(The Cavern), and opt-in email for call sheets issued / changed and job
responses, honouring `notification_prefs`. Done when a call sheet issue
emails the crew who opted in (e2e with the local mail catcher).

### 3.16 Launch-grade repository practice — S each, start now
The owner will open a new repository at launch and wants it to stand up to
investor and acquirer due diligence (`restructure-proposal.md` › *Launch
repository*). Start the practices here so they're real by then: conventional
commit messages; semantic-version releases with tags and a `CHANGELOG.md`;
`LICENSE` (proprietary — owner/lawyer), `SECURITY.md`, `CODEOWNERS`; an
`adr/` folder for decisions; a coverage report in CI; a full-history secret
scan and a dependency licence report (SBOM). Owner: branch protection and
signed commits. Done when each is in place and CI enforces the commit and
coverage rules.
