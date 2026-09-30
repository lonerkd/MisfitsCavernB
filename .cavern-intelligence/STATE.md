# Misfits Cavern — Project State

> Only the latest sessions and open issues live here (this file is injected into every session). Older sessions: [STATE-history.md](STATE-history.md).

## Known Issues

1. Leaked-password protection — dashboard toggle, owner must flip it (also flagged by security advisor)
2. README / production branding / docs polish — partial pass done, could use another round
3. `tsconfig.json` still `strict: false` (audit plan M2.2)
4. `npm audit`: 5 vulnerabilities (1 moderate, 4 high) reported at install — triage pending
5. Security advisor WARNs: public buckets (`sfx-library`, `studio-assets`) allow listing; `has_discord_webhook` executable by anon — review intent


## Latest Session — Type, layout and imagery tokens

Direction in `docs/DESIGN_DIRECTION_2026-09.md`. Text floor 11px, radii and container widths snapped to the scales in `globals.css`, Courier Prime loaded as `--script`, lint enforces text size and radius. **Checked in a browser** (local Supabase, production build, 1280px): breakdown and stripboard show no wrapping or overflow and pass axe; stripboard strip headings and cast lines ellipsize by design in the 256px day column. Checked at 1024 and 768 too: fixed the empty-state icon (invalid margin, not centred) and hid the editor beat-rail labels below 1100px, where they overlapped the script.

## Latest Session — Leaving the suite (and handing a project over)

Migration `20260929090000_account_deletion.sql` (`transfer_project`,
`account_deletion_plan`, `delete_my_account`; 22 author links now clear
instead of blocking or cascading).

- **Settings › Delete account**: anyone can delete their account. Projects
  other people are crew on never go with it — the panel lists them, each with a
  **Hand over** to someone confirmed on its crew (or open it and delete it
  yourself); the delete button stays off until none are left. Then the
  username, typed, and a final confirm.
- **What goes**: the account, profile, the projects only they work on (every
  script, file and note in them — files removed through the Storage API first,
  as SQL can't), portfolio, job posts, applications, notifications and direct
  messages. **What stays**: what they wrote in other people's projects —
  script edits, shots, notes, channel messages, timesheets, audit entries —
  with the author cleared and shown as "Deleted account". A job they posted on
  someone else's project passes to that project's owner.
- **Handing a project over** (`transfer_project`): owner only, to a confirmed
  crew member; the new owner leaves the crew list, the old owner stays on as a
  lead, and the project's job posts move with it.
- The last admin can't delete their account (make someone else admin first).
- Tests: `tests/integration/account-deletion.test.ts` (who may hand over; what
  goes and what stays, row by row; refused while owning a shared project, with
  the wrong username, or signed out), `e2e/account-deletion.spec.ts` (hand
  over, then delete, from Settings). Checked at 390px and 1440px.
- The `profiles.is_admin` "open finding" below was already fixed by
  `20260926030000_privacy_and_integrity.sql` (column grants; `get_my_account`)
  — confirmed in production: neither anon nor authenticated can read
  `is_admin` or `notification_prefs`.

## Earlier — Hearing about problems in production

Migration `20260929080000_client_errors.sql` (`client_errors`, `report_client_error`).

- **The suite reports its own errors**: every crash screen (`app/error.tsx`,
  the admin one, and the new `app/global-error.tsx` for the root layout) and
  every uncaught error / unhandled rejection in the browser
  (`components/ErrorReporter.tsx`) goes to `client_errors` via
  `lib/errors/report.ts` — message, stack, page (no query string), build,
  browser, and who (if signed in). Browser noise is ignored; each error is
  sent once per visit, at most 10 per visit.
- **Admin › Errors** (`/admin/errors`): grouped by message and page, with
  count, people affected, last seen, build and a stack; cleared once fixed.
- The log is safe to expose: anyone can report (signed-out pages count), but
  only through the function, which trims fields and rate-limits (20/min per
  person, 60/min signed out); only admins read or clear; 30 days kept.
- **Vercel Analytics + Speed Insights** (cookieless) on Vercel builds only —
  enable Web Analytics / Speed Insights in the Vercel project to see data.
- Tests: `lib/errors/report.test.ts`, `tests/integration/client-errors.test.ts`
  (personas, trimming, junk, rate limit, no direct writes, admin-only read and
  clear), `e2e/errors.spec.ts` (an uncaught error is logged once and cleared
  from Admin › Errors).


## Latest Session — The workflow that guards the suite

No migration.

- **Production drift check can't pass silently**: it fails when the
  `PRODUCTION_DB_URL` secret is missing (it had never actually run), and it
  now also runs right after schema changes land on main.
- **Every e2e spec runs in CI**: 9 specs (sign-up journey, sign-in, credits,
  cut notes, On Set, shot designer, split screen, the writing loop, real data)
  never ran. CI now runs the whole `e2e/` folder against a fresh local stack,
  split three ways in parallel. Two had rotted: the sign-up journey expected
  `/projects` (new accounts land on the welcome steps) and the sign-in smoke
  needed a pre-made account — both fixed.
- **Layout guard** (`e2e/layout.spec.ts`): the dock hides no app, the Lounge
  composer and editor footer stay above it, nothing scrolls sideways — shown
  to fail on the old code for both the dock and the Lounge.
- **Page-weight budget** (`npm run budget`, `performance-budget.json`), checked
  in CI after the build.
- **Fonts self-hosted** (`app/fonts`, OFL): builds no longer fetch Google Fonts
  (the one CI failure this week).
- Dependabot, a PR template, CODEOWNERS, git hooks (lint on commit; types +
  tests on push), Node pinned (`.nvmrc`), `npm run stack:up` for the local
  stack, a wider command allowlist. See tools-and-access.md §7.

## Earlier — Polish: nothing hidden behind the dock


No migration.

- **The dock shows every app**: its strip snapped icons to the centre, which
  with an even number of apps cut one off at each end at desk sizes. It now
  snaps from the start, in the same whole-icon steps as its own drag/fling.
- **The dock says how much room it takes**: it publishes `--taskbar-height`
  (its real height + gap; 0 where it's hidden — phones, sign-in, split,
  shared pages). The Lounge is exactly one screen tall and ends above it, so a
  long channel list no longer pushes the composer (and Send) under the dock;
  the editor's footer sits above it too. Every page already using
  `var(--taskbar-height, 94px)` now gets the true value.
- **Editor**: the beat timeline (Setup, Break into Two, Midpoint…) no longer
  draws over the story map — it shows only when that sidebar is closed. The
  right panel's six tabs keep their labels inside their own tab.
- **Today on a desk**: the Lounge card sits beside "Yours to do" and
  "Updates", as tall as both — no hole under it.
- Projects search placeholder fits ("Search projects, people…").
- **Crew directory**: the search is one compact row like the Projects board
  (icon inside, 40px tall), with matching All / Open / Busy buttons (a
  labelled group, pressed state announced) — it was a tall floating-label
  field with the filters stretched into tall boxes beside it.
- Verified in screenshots at 1440×900; lounge, mobile, accessibility, Studio
  journey and themes e2e pass.

