# Misfits Cavern — Project State

## Open work — start here

What is unfinished, so any session (local or cloud) can pick it up.

1. **For the owner, outside the code:**
   - have a lawyer read `/privacy` and `/terms`;
   - switch on leaked-password protection (Supabase dashboard › Auth ›
     Passwords).
2. **React Compiler lint warnings (122 left).** Still `warn` in
   `eslint.config.mjs`: `set-state-in-effect` (94), `refs` (21),
   `preserve-manual-memoization` (7). Rework that code a module at a time
   (`npx eslint <file>` lists them), then turn each rule back to `error`.

## Latest Session — Lint pass 1: what the React Compiler rules caught

No migration.

- **148 → 122 warnings; `immutability`, `purity` and `static-components` are
  errors again** (each reached zero). What they found:
  - **Effects calling functions declared below them** (admin, admin users,
    crew, jobs, portfolio manage, the dock's cleanup; the editor's key
    handler and Split listener): moved below, unchanged. Worked at runtime,
    but the compiler couldn't prove it. (`set-state-in-effect` rose 90 → 94:
    it can now see into those functions.)
  - **Time read while rendering** (job "days ago", Lounge activity, project
    timeline): `useNow()` (`lib/hooks/useNow.ts`) reads it once per mount.
    The Lounge loading skeleton's random bar widths, which differed between
    server and browser, are fixed.
  - **Button's `MotionLink` was created inside the component**, so every
    render made a new component type and remounted the link (losing its
    hover/tap state). Made once, at module level.
- Error pages' "Go home" / "Back to projects" are `<Link>`s, not buttons that
  set `window.location`; jobs' "sign in to apply" and profile sign-out use the
  router (profile now matches Settings and ⌘K).
- Unused `eslint-disable` comments removed; `eslint.config.mjs` exports a named
  config.

## Earlier — Dialogs open above the dock

No migration.

- **One layer for dialogs: `--z-modal` (99990)** in `globals.css`, with the
  stacking order written beside it: dock 9999, phone tab bar 10000, dialogs
  99990, toasts 99997, Confirm 99998. On a short screen the dock had covered
  the bottom of dialogs below it — their Create/Save buttons.
- Moved onto it: Start a project, the job dialog, the portfolio Project
  Bible, the editor's title, Character Bible and shortcuts dialogs and its
  error screen, Recruit Talent (crew boards), the pitch deck presenter, the
  phase-unlock reveal, and (already above the dock, now on the token) the
  Lounge and Studio dialogs. Every new full-screen dialog uses
  `zIndex: 'var(--z-modal)'` (or `z-index: var(--z-modal)` in CSS).
- Dialogs that are wider or taller than a phone now fit it and scroll inside
  (`maxWidth`/`maxHeight: 100%`, `overflowY: auto`, 20px gutter).
- Left as they are: the landing page's header menu (`Navigation`, a top
  header, not a dialog) and the Studio drop hint (it ignores the pointer).
- Test: `e2e/layout.spec.ts` opens Start a project on a 640px-tall desk
  screen, scrolls it to the end and checks the Create button is what is drawn
  there; on the old code the dock was.

## Earlier — What the database advisors found

Migration `20260930010000_advisor_fixes.sql`, applied to production and
verified (fingerprint 1738 lines, md5 `e2b521d7…`; the `sfx_assets`, initplan
and unindexed-FK advisor warnings are gone). Supabase's security and
performance advisors, run against production:

- **Sound effects leaked across projects**: `sfx_assets` was readable by
  anyone, signed in or not (`USING (true)`), though every sound belongs to a
  project — Soundtrack › SFX listed everyone's. Now the uploader and anyone who
  can open the project; only the uploader renames or removes. (No rows existed
  in production, so nothing was exposed.) Test shown to fail on the old rule.
- **auth.uid() once per query** in the 9 policies that still called it per row
  (Spotify connections, portfolio blocks, script annotations, Discord
  webhooks, sound effects).
- **Writes split from reads**: 12 tables had a `FOR ALL` write policy beside a
  `SELECT` policy, so every read ran both; the writes are now INSERT / UPDATE /
  DELETE policies (same people, same rules). Portfolio media had the same
  owner policy twice — one set now. Job applications: one read policy.
- **47 foreign keys got covering indexes** — joins, and the `ON DELETE`
  actions behind account deletion, no longer scan whole tables.
- Left as they are, on purpose: the advisors' "SECURITY DEFINER callable"
  warnings (those are the app's RPCs, each checking the caller itself),
  "unused index" notes (little traffic yet), and the two `jobs` read policies
  (`internal.applied_to` isn't granted to anon).
- **Yours to switch on**: leaked-password protection (Supabase dashboard ›
  Auth › Passwords).
- Tests: `tests/integration/advisor-fixes.test.ts` (sound effects as owner,
  crew, outsider, signed out; portfolio owner-only writes); the whole
  integration suite (43 files) passes on the rewritten policies.

## Earlier — Next 16 and React 19

No migration.

- **Next 16.3 + React 19.3** (Dependabot #103), ESLint 9, `eslint-config-next`
  16. What it took:
  - `middleware.ts` → **`proxy.ts`** (`export async function proxy`) — Next 16
    renamed the convention; the gating is unchanged.
  - Dead webpack externals (`pino-pretty`, `lokijs`, `encoding` — nothing uses
    them) removed from `next.config.js`.
  - Two ref props typed `RefObject<… | null>` (React 19 types).
  - **Lint on the ESLint CLI** (`next lint` is gone): `eslint.config.mjs`
    (flat config, Next's core-web-vitals rules), `npm run lint` = `eslint .`,
    the pre-commit hook lints staged files with `eslint`. The React Compiler
    rules that came with it (react-hooks v7: set-state-in-effect, refs,
    immutability, purity…) flag ~140 existing patterns; they are **warnings**
    until that code is reworked — `npm run lint` shows them.
- **Built with webpack, not Turbopack** (`next build --webpack`; `vercel.json`
  pins Vercel to `npm run build`). Measured in a browser, gzipped JS a first
  visit loads: Next 15 / Next 16 webpack / Next 16 Turbopack — `/` 367 / 360 /
  391 kB, `/auth` 348 / 341 / 374 kB, `/showcase` 378 / 397 / 427 kB. React 19
  costs ~nothing; Turbopack's chunking costs 25–50 kB a page, so it waits.
  `next dev` uses Turbopack (fast, no bundle cost).
- **Sign-in page**: the validator (zod) loads on submit, not with the page.
- **Page-weight budget** reads Next 16's per-page manifests (webpack or
  Turbopack); `performance-budget.json` re-baselined on this build (the new
  count includes every client module a page's tree references, so the numbers
  are higher than before for the same code — compare only against themselves).
- **Dependabot no longer opens major-version PRs** (`ignore` semver-major for
  npm and Actions): those are migrations, done on purpose like this one.

## Earlier — Dependency updates (1/2): patches, Vitest 5, and what the new checker found

No migration.

- Minor/patch updates (Dependabot #108's set): `@supabase/ssr` 0.12.7,
  `fast-average-color`, `zustand`, `@playwright/test` 1.63, `autoprefixer`,
  `axe-core` 4.13, `pg`, `postcss`; `actions/setup-node` v7 (#101).
  Already merged from Dependabot: `actions/checkout` v7, `actions/upload-artifact`
  v7, `framer-motion` 13.
- **axe-core 4.13 found real low-contrast text**: the project page's
  department labels (Script, Studio, Jobs…) in theme colours at 7.5px were
  3.7–4.4:1 (need 4.5:1) — `readable()` can't measure `var(--…)` colours, and
  an `opacity: 0.85` made it worse. Theme colours are now mixed toward the
  text colour; the accessibility and themes e2e pass under the new checker.
- **Vitest 5** (Dependabot #104) with `@types/node` 22: all unit and integration tests pass unchanged.

## Earlier — Privacy Policy and Terms

No migration.

- **`/privacy` and `/terms`**, public, for Peter Olowude (an individual, not
  yet a registered business) in Alberta, Canada; contact
  peterolowude@icloud.com — all in `lib/legal.ts` (change there, and move
  `effective` forward whenever the wording changes).
- Written to match what the app does: what's collected (account, profile,
  work, preferences, error reports kept 30 days, cookieless Vercel
  analytics), who handles it (Supabase, Vercel, Discord, Spotify, Have I Been
  Pwned's k-anonymity check, Openverse, embeds), PIPEDA rights mapped to real
  controls (export, edit, Settings › Delete account), what account deletion
  keeps ("Deleted account" in others' projects). Terms: users own their work
  (a licence only to run the service), collaboration and hand-over rules,
  acceptable use, Canadian notice-and-notice, "as is", CAD $100 liability cap,
  Alberta law. **Not legal advice** — worth a lawyer's read before launch.
- Linked from the landing footer, the sign-up form ("By creating an account
  you agree to…") and the foot of Settings. The landing footer now clears the
  dock (`--taskbar-height`) — its links were underneath it.
- Test: `e2e/legal.spec.ts` (public, names the operator and contact, no
  sideways scroll at 390px, reachable from the landing page and sign-up).

## Earlier — Leaving the suite (and handing a project over)

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


## Earlier — The workflow that guards the suite

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

## Earlier — Faster to open (phones first)


No migration.

- **Studio opens with only the tab you're on**: each tab, and each Production
  view (stripboard, money, On Set…), loads when opened — first load 376 kB →
  272 kB.
- **The editor opens without the PDF engine**: jsPDF loads when you export a
  PDF, the revision diff when you open it — first load 478 kB → 347 kB. PDF
  export verified end to end (a real `%PDF` download).

## Earlier — Pocket: the suite on the go

Migration `20260929070000_pocket.sql` (a `note` kind of library item; `ui_prefs.places`).

- **Capture** — the centre tab on a phone. A photo or clip from the camera, a
  **voice memo** (written down as you talk where the browser can: each
  sentence becomes a transcript line stamped at its moment in the recording,
  so it's findable and ready for the paper edit), a **note**, a **link**, or
  anything from files — into the project you pick, two taps. It's in Studio ›
  Library on every device at once.
- **Nothing is lost without signal**: every capture is kept on the phone first
  (IndexedDB outbox, `lib/pocket/outbox.ts`) and sent from there — at once when
  online, otherwise when the connection is back or the app comes to the front.
  What's waiting shows in Capture (retry / discard) and as a badge on the tab.
- **Share into the suite**: installed as an app, Misfits Cavern is in the
  phone's share menu — a link shared from any app lands as a link, text as a
  note (manifest `share_target`). The home-screen icon opens Today, and a long
  press offers Capture, Today and the Lounge.
- **Notes are library items** (`media.kind = 'note'`): words only, never in a
  share link (enforced in the database). Desktop Library has "Note" beside
  "Add link"; notes read as cards, filter as Notes, and are found by search.
- **Continue on the other device**: the suite remembers the last place worth
  coming back to on a phone and on a desk (a script, a Studio tab or view, a
  project page, a conversation) in the account (`ui_prefs.places`). Today —
  and the first page of a visit on the desk — offers "Continue from your
  desktop · 20 min ago: Night Shift — script", switching to the right project
  first. Waved off per device.
- Search moved into More on the phone ("Search everything"), with a search
  button on Today.
- **Small print is readable on a phone**: every size under 10px suite-wide is
  now `max(Npx, var(--mc-min-font))` — unchanged on a desk, 11px at phone
  width (the 390px audit's sub-10px text went from dozens per page to ~0, with
  no new sideways scroll). `.mc-hit` gives small controls (the project page's
  module switches, inline links, "Show all") a thumb-sized touch area on touch
  screens without changing their look.
- Tests: `lib/pocket/places.test.ts`, `lib/pocket/capture.test.ts`,
  `tests/integration/pocket.test.ts` (notes by persona, never shared, words
  only; places validated and private), `e2e/mobile.spec.ts` (Continue from the
  desk, capture a note, share a link in, the phone's place saved).

## Earlier — The suite on a phone

No migration — PR #93 merged.

- **A phone gets its own navigation**, not the desktop dock squeezed: a
  thumb-reach tab bar — **Today · Projects · Search · Lounge · More**. More is
  a sheet with every tool, the project you're working on (switch it there),
  and whatever the page offers in the desktop dock's context capsule ("On this
  page"), so nothing on desktop is out of reach. It steps aside while typing,
  in the editor, and on public pages. Desktop keeps the dock (now with Today).
- **Today** (`/today`) is the working home on the go: the coming days on set
  with your own call time, crew call, weather and the address a tap from maps
  ("Open On Set" on the day); what's yours to do, most urgent first, ticked off
  right there; what's unread in the Lounge by channel and person; updates; and
  each project with one-tap Script / Studio / Schedule. Crew see issued days
  only; the owner sees drafts, marked.
- **The Lounge on a phone** is one pane at a time — channels and people, or
  the conversation — with a back button; links open a conversation directly
  (`/lounge?channel=…`, `?dm=…`), and mention / reply / DM notifications now
  land there.
- **Every route was measured at 390px** (overflow, tap targets, text size,
  iOS zoom): no page scrolls sideways any more; fields don't zoom; Studio
  buttons, chips, toggles, stripboard status and phase "Go" buttons are
  thumb-sized on touch screens; the production board is one phase per screen,
  swiped; the phase rail scrolls instead of overlapping; Jobs' role filter is
  a chip row; the project and Studio headers fit; scene cards stack; the
  editor's beat labels no longer cover the script.
- Tests: `lib/today/core.test.ts` (days, calls, urgency, ordering),
  `e2e/mobile.spec.ts` (tab bar vs dock, Today → tick off a task, More,
  Lounge link → back, no sideways scroll on nine routes, axe on Today).

## Earlier — Links that know what they are

No migration — PR #92 merged.

- **Pasting a YouTube or Vimeo link** into the Library brings the video in
  under its real title, with its channel in the notes — no more "YouTube
  video" cards.
- **Pasting a public Pinterest board** offers to bring its latest pins (up to
  50) into the library as images, on a board named after it, each pin's page
  kept in its notes for credit.
- Both come from public sources with no keys (oEmbed, the board's RSS feed)
  through `app/api/links` — rate-limited, and only ever calling those
  providers with an address rebuilt from a checked one (`lib/integrations/links.ts`,
  unit-tested). No answer means the link is added as it was.
- Spotify sign-in's PKCE verifier and state are now uniformly random
  (rejection sampling instead of `% 62`).

## Earlier — Transcripts and the paper edit

Migration `20260929060000_transcripts.sql` (`transcript_lines`, `set_paper_edit`) — applied to production; PR #91 merged.

- **Every interview, take or recording in the Library has a transcript**
  (video and audio items): paste one in — subtitles (SRT, WebVTT), a
  transcription service's text ("[00:01:23] Ana: …"), or plain paragraphs —
  type lines as you watch (a blank time takes the player's), or **dictate**
  with the browser's speech recognition, each sentence stamped at the
  player's time. Click a time to play from it; the line playing is
  highlighted; find in the transcript; copy it out.
- **Star the lines that tell the story** and they line up in **Studio › Post
  › Paper edit**, across every recording, in order: move them up and down,
  take them out, see the running time, copy or download it for the edit.
- The documentary and podcast guides' "Log your footage" step now points at it.
- Same access as the library (owner and crew; outsiders see nothing); crew
  remove the lines they added, the owner any. `set_paper_edit` is all or
  nothing and runs with the caller's rights.
- Tests: `lib/studio/transcript.test.ts` (parsing every format, stamps, the
  paper edit), `tests/integration/transcripts.test.ts` (personas, bad input,
  deletes, cascade, ordering), `e2e/transcripts.spec.ts`.

## Earlier — Themes for the whole suite

Migration `20260929050000_themes.sql` — applied to production; PR #90 merged.

- **Settings › Appearance › Theme**: twelve presets shown as small previews —
  Cavern, Terminal, Blueprint, Mono, Paper, Editorial, Glass, Neon, Slate,
  Lagoon (light + teal), Forest, Vampire — plus **System** (Paper when the
  device is light, Cavern when dark) and **Custom** (pick a background and an
  accent; text, lines and status colours are worked out from them).
- The choice applies at once, is saved to the account (`ui_prefs.theme`) so
  every device follows it, and is painted before first paint from the device
  copy — a light theme never flashes dark. Old device choices (cyberpunk,
  obsidian) map to Neon and Mono.
- **Every page reads in every theme**: hard-coded white, cream and black were
  replaced with theme tokens suite-wide (`--fg-strong`, `--fg-rgb`,
  `--ink-rgb`, `--surface`, `--sunken`, `--on-accent`, status colours with
  light-theme variants). Colours from data (project accents, crafts, scene
  types) go through `readable()`, now a `light-dark()` pair. axe colour
  contrast is clean on hub, projects, a project, Studio, the editor, Lounge,
  Jobs, Crew, Settings and Profile in the light themes.
- Shared pages (`/p`, `/s`, `/shared`) keep the maker's Cavern look.
- Tests: `lib/themes.test.ts` (every preset's tokens and contrast, choices,
  System, Custom), `lib/color.test.ts`, `tests/integration/themes.test.ts`
  (saved, refused, owner-only), `e2e/themes.spec.ts`.

## Earlier — On set without signal

No migration.

- **On Set keeps working when the connection drops** (basements, fields,
  car parks). A shot got or dropped, a scene wrapped, a clock stamp or its
  correction, a continuity note, a day note — each shows at once; if it
  can't be sent it waits in a queue on the device (`lib/studio/onset-offline.ts`,
  unit-tested) and is sent in order the moment the connection is back
  (`useOnSetSync`). Only the last status of a shot or scene is sent; an entry
  removed before it was sent is never sent; a resend of something already
  saved counts as sent; anything refused is reported.
- A banner says where things stand: "No signal — keep working… 3 changes
  waiting", "Back online — sending…", "3 changes sent".
- **It opens without signal**, too: the last copy of the day is saved on the
  device on every change, and the project list and profile are cached per
  account (`lib/os/boot.ts`), so a cold start offline opens the day straight
  away — boot no longer waits on the network when the device says it's
  offline.
- Photos still need a connection (a continuity photo is a file upload); the
  note can be logged without it. Signing out clears the device copies.

## Earlier — Search everything from ⌘K

Migration `20260929040000_search.sql` — applied to production; PR #88 merged.

- **⌘K (or the dock's search button) now searches your work**, not just
  page names: projects (title, logline), scripts — including what's written
  in them, with the matching line shown — scenes, characters, library items,
  locations, paperwork, tasks and cut notes, plus open jobs and people.
  Word starts match ("harb nig"), and punctuation splits words
  ("mara_okafor").
- A result opens where it lives: a script in the editor, a task on its
  project page, a location in Studio › Locations with its project made
  active, a person on their crew page (`lib/search.ts`, unit-tested).
- `search_suite(query)` runs with the caller's rights, so each table's
  policy decides; project work is limited to projects you own or are
  confirmed crew on, and sample people stay out. Script text has a GIN index.

## Earlier — Who's away on a shoot day

Migration `20260929030000_availability.sql` — applied to production; PR #87 merged.

- **Your profile › Dates you're away**: a day or a range, with a note only
  you see (`unavailability`, your rows alone).
- **The people who plan a production** (owner, leads, contributors) see
  who on it is away — dates only, never the note — through
  `project_availability(project, from, to)`:
  - **Schedule › Call sheets**: a dated shoot day that falls in someone's
    time away says so ("Away that day: mara (Oct 9–11)") before it's issued.
  - **Cast & crew**: each person's coming time away under their name.
- Crew who don't plan the production, outsiders and strangers see nobody's
  dates. Pure helpers (ranges, conflicts, "Oct 3–5") in
  `lib/availability/core.ts`, unit-tested.

## Earlier — Guides, as deep as each person needs

Migration `20260929020000_guides.sql` — applied to production; PR #86 merged.

- **Every project has a guide** (project page, under the brief): the
  workflow that fits it — *Your first short*, *Short film*, *Feature film*,
  *Series*, *Music video*, *Documentary*, *Podcast*, *Commercial*, or *On the
  crew* for someone else's project — picked from the format and experience,
  and switchable. Steps come from one library (`lib/guides/steps.ts`); most
  tick themselves from the project's data (the phase milestones, the
  breakdown, locked revisions), the rest are ticked by hand.
- **How deep it goes is the person's call**: four answers — how much
  they've made, hours a week, who's making it with them, how much
  explanation — asked on /welcome (a new step), the first time a guide
  appears, and in Settings › Workspace. *Walk me through it* adds why, how
  and what to watch for, plus the basics (how a shoot day runs, coverage,
  the order of post); *Steps and tips* gives one tip per step; *Just the
  checklist* one line. The default follows experience.
- **Paced to their time**: effort scales with team (alone ×1.3, crew ×0.8)
  and experience (first ×1.3, seasoned ×0.8); "This week" fills their hours;
  the header says what's left ("about 146 hours — about 4 months at 8h a
  week"). A solo filmmaker gets no crew or table-read steps; only a real crew
  locks a shooting script.
- **Structure-aware**: the outline step speaks the brief's story structure
  (Save the Cat beats, the story circle, TV acts, a documentary arc…).
- **Role-aware on the crew**: an actor gets "Know your scenes" and "Learn
  your lines"; a DP "Walk the shot list"; everyone "Check your call sheet"
  and "Sign your paperwork" (department from their craft on the project).
- /welcome also asks where a new project is (an idea … getting it out
  there) and starts it in that phase.
- Storage: `profiles.ui_prefs.guide` (validated by `set_my_ui_prefs`) and
  `guide_progress` (per person and project: workflow, ticked steps, hidden —
  own rows only, on projects they can open).

## Earlier — The landing page counts only real work

Migration `20260929010000_sample_data.sql` — applied to production; PR #85 merged.

- The landing page already ran on real data (platform totals, open jobs,
  published work — no invented testimonials, stats or pricing). But the demo
  world's sample people and projects are real rows, so they counted too and
  their casting calls reached everyone's Jobs board. Now `profiles.is_sample`
  and `projects.is_sample` mark them (the demo seed sets both), and public
  surfaces leave them out: platform totals (`get_platform_stats`), recent
  work (`get_recent_work`), the showcase, the crew directory and people
  search. Sample jobs are listed only for the people inside that production
  (`internal.job_listed` in the jobs policy); nobody flags or unflags
  themselves (`profiles_guard`).

## Earlier — The Lounge: unread, pinned, edited, searchable

Migration `20260929000000_lounge.sql` — applied to production; PR #84 merged.

- **Unread**: channels with news are bold with a count, and so are crew with
  unread direct messages; the pill shows the total. Opening a channel (or a
  conversation) marks it read, and it stays read as messages arrive while
  it's open. Counts refresh live (`lounge_reads`, `lounge_unread()`).
- **Pinned**: whoever runs a channel pins a message (either person can in a
  DM); pinned messages carry a PINNED mark and are listed under **Pinned**
  in the channel header, one click away.
- **Edited**: you can reword your own message (Enter saves, Esc cancels); it
  reads "(edited)". Nothing else about a message can be changed.
- **Search**: across everything you can read or within the channel; word
  starts match ("warm lay"); a result opens its channel — in another
  production if need be — or the conversation, and scrolls to the message.

## Earlier — A demo world to play in

`scripts/demo/` seeds an account with the whole pipeline (`npm run demo:sql -- <email> [tz] > demo.sql`, then run it as the database owner; `--portable` leaves the email out and reads `set demo.owner = '…'`). Seeded into kingsavyt@gmail.com in production (its own projects untouched); PR #83 merged:

- **Salt Lines** (short, an idea: logline, two answers, two references) ·
  **The Quiet Hours** (feature, development done: draft, characters, beats,
  mood board) · **Night Shift at the Lantern** (short, pre-production: crew,
  casting, shots, breakdown, locations, money, call sheets — night one issued
  — paperwork, an open casting call with an applicant) · **Paper Moons**
  (music video shooting *now*: yesterday wrapped with a set log, today
  rolling, timesheets) · **Ashfall** (post: cuts, open notes, the pipeline
  half done) · **Harbor Lights** (delivered: link-shared, festivals,
  campaigns, portfolio) · **Late Checkout** (podcast) · **Wolf Moon**
  (archived) · **Undertow** (someone else's film where the account is cast:
  tomorrow's call sheet, a release to sign, an application pending).
- Sample people are password-less accounts on `demo.misfitscavern.invalid`.
  Re-running replaces the demo projects with fresh ones (dates relative to
  the run; "today" is today in the account's time zone).
- Fix: the projects board no longer counts down to a delivered project's end date.

## Earlier — Paperwork: permits, insurance, releases, contracts

Migration `20260928100000_documents.sql` — applied to production; PR #82 merged.

- **Studio › Production › Paperwork** (the Crew tool): every document the
  production keeps — permits, insurance, releases, contracts, other — each
  with its state in its own words (permit Applied for / Granted, release
  Sent / Signed, insurance Quoted / Active), who or what it's about (a crew
  member, a location, a vendor, another party), an expiry ("Active ·
  expires in 9d", "Expired 3d ago"), and a private file (PDF or image, 20 MB).
- **Still needed**, read from the production: insurance once there's a crew
  or a location, a permit for each location that needs one, a release for
  everyone cast, a deal memo for the rest of the crew — one click adds it
  (`lib/studio/documents.ts`, unit-tested).
- **A permit on file moves its location along**: pending → the location's
  permit reads Applied, done → Granted, so Readiness unblocks the scene.
- Crew see only "Your paperwork": the documents naming them and their files.

## Earlier — Money: spend, vendors, timesheets

Migration `20260928090000_money.sql` — applied to production; PR #81 merged.

- **Studio › Production › Money** (the Budget tool): planned / committed /
  paid / left in total and per budget line ("$600 over" in red); spend
  lines — committed (a purchase order is out, with its PO number) or paid —
  against a budget line and a vendor (added inline); timesheets.
- **Paid spend keeps the budget line's actual in step** (trigger), so the
  project page's budget agrees; it links to Studio › Money.
- **Timesheets**: everyone on the production logs their own hours per day;
  the owner and leads approve (setting the $/h rate) or reject — approved
  hours × rate count as paid labour. Approved hours are settled for the crew;
  an owner's correction sends them back for approval.
- Spend and vendors are visible only to those who shape the project; crew
  see and log only their own hours. Sums in `lib/studio/money.ts`.

## Earlier — Locations as records

Migration `20260928080000_locations.sql` — applied to production; PR #79 merged.

- **Studio › Production › Locations**: every location the script names
  (INT. HARBOR - NIGHT → HARBOR), busiest first, with its scenes, shoot days,
  exterior/night — and a record the production fills in: status (scouting →
  on hold → confirmed), permit (not checked / not needed / needed / applied
  / granted), address (with a map link), contact, cost, notes. Locations the
  script doesn't name yet can be added. "2 of 5 locked down".
- `project_locations` is keyed by the heading's name (upper case), so scenes
  link through the script with nothing to maintain; RLS as call sheets.
- **Readiness** gains a Location check: a scene is blocked until its location
  is confirmed with any permit it needs granted ("HARBOR permit pending");
  "What unblocks the most" says "Lock down CAVE, RIDGE".
- **Call sheets** offer the day's location address: "CAVE is at 1 Cave Rd.
  Use this address".

## Earlier — The hiring loop

Migration `20260928070000_hiring_loop.sql` — applied to production; PR #79 merged.

- **Casting calls**: the Casting board's open role → "Post a casting call"
  opens Jobs with the post written from the script (scenes, shoot days) and
  `jobs.character_name` set. Cards and the job page say "Casting call · the
  role of Maya".
- **Apply from the card**: Apply opens a note to the poster inline; the card
  then reads "Applied · pending/accepted". My Jobs lists what you applied to
  with its status (applicants can still read a posting after it closes).
- **Accept in one step** (`respond_to_application`): status, the crew (craft =
  the job's role; someone already on the crew keeps their role — the old
  client upsert demoted leads), the casting for a casting call, "Close the
  posting when I accept someone", and the applicant told ("You're cast as
  Maya in Tidewater.", linking to the project).
- **Fix**: anyone could link a posting to any project; now only people who
  can shape the project (owner, leads, contributors) can.

## Earlier — Call sheets reach the crew

Migration `20260928060000_call_sheets_issue.sql` — applied to production (pg_cron enabled, job scheduled); PR #78 merged.

- **Issue, then revise**: a call sheet is a live draft until the owner or a
  lead issues it (Studio › Schedule › a day › "Issue to the crew", with an
  optional note). Later edits show "Changed since v1: location, 1 call" and
  go out as "Issue revision (v2)". `issue_call_sheet()` stamps the version
  and a snapshot of what went out (`call_sheets.issued`).
- **Everyone gets their own call**: a notification per person — "Your call
  07:00 as MAYA. At 40 Pier St." — and on a revision what changed for them
  ("Changed: location, your call 06:30 → 07:00."). Cast get the call of the
  role they're cast in (`character_castings`).
- **The crew view** `/call/[id]` (where the notification lands): their call
  first, "Got it" to confirm the version (`ack_call_sheet`,
  `call_sheet_acks`), the day's facts with a map link, scenes, everyone's
  calls; prints clean. Studio shows "Confirmed v2: 3 of 5" live.
- **Reminders**: pg_cron runs `send_call_sheet_reminders()` hourly; each
  issued sheet reminds everyone once from the day before its date (UTC).
- Snapshot logic mirrored client-side in `lib/studio/call-sheet.ts`.

## Earlier — Onboarding, the projects board, empty states that lead somewhere

Migration `20260928050000_onboarding.sql` — applied to production; PR #77 merged.

- **`/welcome`** (a new account lands here after sign-up, email or OAuth):
  what you do (craft → `profiles.role`), what you came for (make something /
  find work → Jobs / meet filmmakers → Lounge / show my work → portfolio), and
  — to make something — title, format, logline and the format's first three
  development brief questions. The project opens where its first step is
  (`lib/onboarding.ts`, via the phase engine): with a logline, the script;
  without, the project page at the logline. The New Project modal does the
  same and links to the guided start.
- **The projects board**: search (title, logline, format, people), sort
  (recently active, newest, title, end date, furthest along), and each card
  shows its phase progress and next step ("Development · 1 of 5 done · Next:
  Start the script") from `projects_progress(ids)` — one call for every card.
  Owners **archive** a project (`projects.archived_at`): off the board and the
  Studio picker until restored from the Archived view. Board logic in
  `lib/os/board.ts` (unit-tested).
- **Empty states name the next step and link to it**: Studio crew (Recruit /
  Post a role), scenes with no headings (Write a scene), share (Open the
  Library), the crew directory (Recruit in Studio / Post a role / Clear
  filters), Jobs (filtered to nothing → Show every role), portfolio (Add your
  first piece), the Lounge (Open #start-here; who can post). Studio tabs can
  jump to each other in place (`useStudio().goTo`).

## Earlier — Phases v2: the suite grows with the production

Migration `20260928040000_phases_v2.sql` — applied to production; PR #76 merged.

- **The suite suggests the phase** the project's data says it has reached
  (`suggestPhase` in `lib/os/progress.ts`): the first shoot day has come,
  every scene is wrapped, the post pipeline or deliverables are done, the
  next phase's work has deliberately started (not scenes from writing or a
  dated call sheet), or this phase's milestones are all done. On the phase
  panel: "Looks like Production — your first shoot day has passed" with
  Move / Not yet (remembered per project and phase).
- **Tools arrive inside the editor and Studio**: new tools *Breakdown &
  readiness* and *Revisions* (pre-production; early once elements are tagged
  or a draft is locked). A development project's editor has no revision
  toggle, Lock Revision or Breakdown tab; Studio's Breakdown and Readiness
  views show the "opens in …" card. Personal scripts keep everything.
- **Show every tool** (Settings › Workspace): the account's choice to open
  everything in every project; per-project "Open all" stays.
- **One-line intros**: the first time you open a tool that arrived after the
  start — "New here: Schedule & call sheets. … It arrived with
  Pre-Production." — dismissed once, for good.
- `project_progress()` adds `shoot_start`, `shoot_end`, `breakdown_elements`,
  `revisions`; `profiles.ui_prefs` holds the choices (private, via RPCs).

## Earlier — ScriptOS reads the brief out of the screenplay

Migration `20260928030000_brief_detect.sql` — applied to production; PR #75 merged.

- The special-needs question is answered by the script before anyone ticks
  it: fights, weapons, vehicles, animals, children (a character intro with
  an age under 13), water/weather, crowds, night exteriors, blood and
  prosthetics, VFX — each with the scenes it's in.
- Until the question is answered, what the script shows drives roles and
  the breakdown ("Roles this project needs: Gaffer — because of night
  exteriors in the script (scene 1)"); after, it's a suggestion with a
  one-click Add, and the chips say "· script".

## Earlier — The project brief: the suite adapts to the project

Migration `20260928020000_project_brief.sql` — applied to production; PR #74 merged.

- **The brief** (project page, under the phase panel): what the project is,
  answered as choices phase by phase — genre, tone, target length, when it's
  set, goals, audience, structure; budget level, planned days, camera style,
  shooting on, locations, special needs; dailies; music, sound mix, frame,
  finishing; festivals, platforms, accessibility. Questions follow the
  format and earlier answers (festivals only if the goal includes them).
  Questions and options are data (`brief_questions`); each option says what
  it implies for the rest of the suite.
- **What moves it forward**: ranked, phase-aware — the script vs the target
  length, a festival short over 40 minutes, shooting days vs the budget's
  pace, roles the brief needs that nobody on the crew does (each with a
  "Post" link that opens Jobs with the post written from the project), empty
  breakdown categories the brief calls for, night exteriors without a gaffer,
  scenes without references, uncast characters, channels to open, a
  vertical cut for social, licensed music vs release.
- **Tools adapt**: Studio › Crew shows the roles/casting/night moves; the
  Breakdown shows categories to tag; the editor's Stats measure runtime
  against the brief's target; the Lounge offers the owner the channels the
  phase calls for (script-notes → above the line, legal → owners,
  production → below the line, dailies once the shoot starts, updates →
  public at delivery…, from `channel_presets`).
- Docs: `.cavern-intelligence/project-brief.md`.

## Earlier — The Lounge: who each channel is for, guides, the community

Migration `20260928010000_community.sql` — applied to production; PR #73 merged.

- **Who it’s for** (`channels.audience`, enforced by `internal.can_view_channel`).
  Project channels: *Whole team*, *Owners* (creator + leads), *Above the line*
  / *Below the line* (by the member's craft — `crafts.above_the_line`: Director,
  Producer, Writer, Story editor, Actor, Voice actor; owners see both),
  *Guests* (members added as viewers, plus owners) and *Public* (anyone signed
  in can read — a production's updates; listed under "Other productions").
  Community channels: *Everyone* or *Admins*. Chosen when creating a channel
  and changeable in Manage. "Private" stays an invite-only overlay.
- **Guides** — a channel type for FAQ, the start-here tour and tutorials. It
  reads as a document (each post a section, first line its heading); only
  whoever runs it writes (and can remove a section); no chat box for readers.
- **The community**: admins create and run site-wide channels (nobody could
  before). Starters: start-here, faq, tutorials (guides — empty until an
  admin writes them), announcements, general, craft-talk, crew-call,
  feedback, showcase, the-lounge (voice), admins. Existing ones kept.
- **Fixes**: a private community channel was visible to everyone signed in —
  now members (and admins) only. Messages can be removed by their author or
  whoever runs the channel (there was no delete policy).
- **Lounge refetch loop (live bug)**: the page reloaded messages and profiles
  in a tight loop for every signed-in user (an effect set the user object it
  depended on), eventually freezing the tab and hammering the DB. Fixed.

## Earlier — Credits & the press kit

Migration `20260928000000_credits.sql` — applied to production; PR #72 merged.

- Credits come from the work itself, never typed twice: projects someone
  created, the crew they were confirmed on (their craft) and the parts they
  were cast in.
- **Crew profiles** list them ("Salt (2026) — Gaffer · Plays MAYA"); on your
  own profile, **Add to portfolio** makes a portfolio entry linked back to the
  project (title, format, year, your credits).
- **Share page = press kit**: festival laurels ("Official selection" for
  accepted submissions) under the logline, and Cast & crew by department.
- Privacy: outsiders see a project in someone's credits only when it's
  public; teammates see their team's. The press kit only exists for
  link/public projects.

## Earlier — The writing loop

Migration `20260927110000_writing_loop.sql` — applied to production; PR #71 merged.

- The editor's daily goal and sprint were cosmetic (a goal of 1,000 fixed in
  code measured against the script's *total* size; the sprint couldn't be
  restarted without a reload; nothing was saved). Now:
- **Today**: words actually typed today (a paste or a loaded file doesn't
  count) against your own goal (click to change; saved to your profile).
- **Streak**: consecutive days you met your goal (each day judged by the goal
  you had that day), best streak, and the last four weeks as a grid.
- **Sprint**: your length (5–120 min), start / pause / reset, words this
  sprint (also in the header), logged when it ends.
- **Earned**: first goal, 7- and 30-day streaks, a 2,000-word day, 10
  sprints, 20,000 words — all derived from your real days.
- Saved a few seconds after typing pauses, every 20s, and when you leave.

## Earlier — On set

Migration `20260927100000_set_log.sql` — applied to production; PR #71 merged.

- **Studio › Production › On set** — the production phase finally has its
  tool. It opens on today's call sheet (else the next day): location, planned
  call and wrap, and your own call time. The crew stamp the day's clock with
  one tap each (crew call, rolling, lunch, back in, wrap — tap to correct),
  and see time on set and time to (or past) the planned wrap.
- The day's scenes with their shots as big Got / Drop buttons; the first shot
  got starts the scene; "Wrap scene" wraps it — the same status the
  stripboard, readiness and milestones use. Meters for scenes, pages, shots.
- Continuity per scene: notes with shot, take and a photo from the phone's
  camera (saved to the library's "Continuity" board). Day notes and the day's
  log. All live for everyone on the project.
- `set_log` (one row per event), composite FKs to the project, only
  time/words editable (author or owner), realtime. Also in split screen.

## Earlier — Real data, not presets

Migration `20260927090000_campaigns.sql` — applied to production; PR #70 merged.

- **Home**: the invented previews are gone (the fake crew chat, asset file
  names and screenplay). Signed-in tiles show your latest script, media and
  channel messages; with nothing to show — or signed out — they show the shape
  of the thing and say what will appear. The Portfolio tile shows the latest
  published works. The ticker is live public activity (`lib/home/ticker.ts`):
  who's hiring, what was just published, platform totals — hidden when there
  is nothing real. Platform stats load for visitors too.
- **Promos**: no preset platform list. Name any platform; the form suggests
  the ones your team has used (most used first). Campaigns move through
  Drafting / Live / Wrapped, spend is editable, and "Where the budget goes"
  compares spend to budget per platform. DB: status CHECK, platform/title
  bounds, non-negative money, no default platform.
- **Soundtrack › Moods** are read from the project's script
  (`lib/spotify/moods.ts`): each scene's strongest mood from what happens in
  it (else its time of day), grouped with their scenes; each opens a Spotify
  search. Replaces a fixed list of 11 moods.
- **Audio widget (free mode)**: plays the project's Spotify references and
  your own playlists (`me/playlists`; new connections also grant
  `playlist-read-private`) instead of four hardcoded playlist ids.

## Earlier — Cut notes on script lines

Migration `20260927080000_cut_note_lines.sql` — applied to production; PR #69 merged.

- Studio › Post › Cut review: the **script beside the cut**. The scene on
  screen follows playback: scenes are laid along the cut by their length
  (table-read time, else page length) and pinned by the notes already made,
  so the more you note, the better it tracks. A scene strip jumps anywhere.
  Click a line to pin the next note to it; a note without a line is tied to
  the scene shown. The scene dropdown is gone.
- `post_notes.line_offset` / `line_text`: the line relative to its scene's
  heading, and its text then, so edits elsewhere don't move it and edits
  inside the scene re-find it (`lib/studio/cutlines.ts`).
- The editor shows cut notes **in the script's margin** on their line (live),
  resolvable there, each linking to its moment in the cut
  (`/studio?tab=post&project=&cut=&t=` seeks when the player can). "In
  script" on a note opens the editor (or the other split pane) on the line.

## Earlier — Table read & runtime

Migration `20260927070000_table_read.sql` — applied to production; PR #68 merged.

- Page count and runtime are measured like the industry does
  (`lib/scriptos/timing.ts`): 55 printed lines a page, each element wrapped at
  its own width (dialogue narrow, action wide), notes/sections don't print,
  about a minute a page. Replaces the word-count guesses (words ÷ 185 pages,
  × 0.8 minutes, words ÷ 190 eighths) in the editor and the scene sync.
- The table read now **times each scene** it reads in full (from its heading,
  pauses excluded) and saves it (`scenes.read_seconds`/`read_at`; personal
  scripts keep it on the device). Read scenes count at their read time; the
  rest are scaled by how the read ones compared to estimate (clamped).
- Editor › Stats › **Runtime**: total, pacing strip (read scenes green), per
  scene length in eighths / estimate / read / runtime, jump to a scene or
  table-read from it; **Who speaks**: speeches, words, scenes, talk time.

## Earlier — Shot designer

Migration `20260927060000_shot_designer.sql` — applied to production; PR #67 merged.

- Studio › Scenes: each scene's shots are a **storyboard** (`components/studio/shots`).
  Each card is drawn by its framing (`FramingDiagram`, `lib/studio/framing.ts`:
  a window onto a figure per size — EWS…ECU, OTS, POV, 2S, Insert; Dutch tilts
  it, overhead looks down) or its storyboard frame from the library
  (`shots.frame_media_id`, same-project composite FK, cleared if the image is
  deleted). The camera is set on a visual picker: framing swatches, angle,
  move, lens. Drag or arrow buttons reorder (`reorderShots`). Shots made from a
  "Shot" margin note show the script line and open the scene in the script.
- Camera fields are bounded in the DB. The shared Studio modal (and the camera
  dialog) now sit above the Studio header and the taskbar (they were covered).

## Earlier — Split screen

PR #66 merged. No migrations.

- **`/split`**: any two surfaces side by side — the script beside Scenes,
  Readiness beside the script, the breakdown beside the schedule… Each pane is
  the real page in a same-origin frame (full features), without the suite's
  chrome. Resizable (drag, or arrow keys on the divider; double-click / Enter
  resets), side by side or stacked (stacked on phones), swap, per-pane surface
  menu, open a pane full screen or close it. Layout lives in the URL and on
  the device.
- **Linked panes**: the script's caret scene lights up in Scenes and opens in
  Readiness; "In script" on a scene card (and "Open in script" in Readiness)
  moves the script to that scene. Outside a split, those go to
  `/editor?script=…&scene=…`, which the editor now honours.
- Open it with Ctrl+\ (⌘\), the taskbar's split button, or ⌘K → Split screen.
- Security: only this site may frame its pages (`frame-ancestors 'self'`,
  `X-Frame-Options`) — none existed before; share pages stay embeddable.

## Earlier — Scene readiness

Migration `20260927050000_readiness.sql` — applied to production; PR #65 merged.

- **Studio › Production › Readiness**: every scene against what it needs to
  shoot — cast, breakdown (tagged + all ready), shots, a dated shoot day,
  references (optional) — computed from the data (`lib/studio/readiness.ts`),
  grouped by shoot day, next day to prepare, "what unblocks the most", each
  blocker linked to its fix. Live: `character_castings` joins Realtime.
- `studio_boards` / `studio_assets` dropped (owner approved; the two rows were
  external links on a board with no project — recorded in PR #65's body).
- Next (user-approved list): split screen (editor ↔ Studio, any pair, linked),
  shot designer, table read + runtime, cut notes on script lines, rest of the
  hardcoded sweep, ecosystem design from the dream users.

## Earlier — The breakdown remembers

Migration `20260927040000_breakdown_memory.sql` — applied to production; PR #64 merged.

- `breakdown_memory()`: what you tagged in your other projects. The editor's
  suggestions now include things you've tagged before when a scene names them
  (in any case, plurals and possessives too) — "you've tagged it before" — and
  a CAPITALISED word is filed where you filed it last time, not where the
  parser's fixed word list guesses. Words inside an offered name aren't
  offered again alone ("TRENCH COAT" → one suggestion).
- `scenes.elements` dropped; `sync_script_scenes` no longer stores the
  parser's guesses (nothing read them since the breakdown tables).

## Earlier — Project formats as data

Migration `20260927030000_project_formats.sql` — applied to production
(fingerprint matched on all 12 categories, no project's `updated_at` moved);
PR #63 merged.

- `project_formats` (10 formats, admin-extendable) replaces four lists that
  disagreed: the new-project modal's six types, `lib/projectTypes.ts` phase
  templates (deleted), the phase label overrides in `lib/os/phases.ts`, the
  engine's hardcoded Podcast/Documentary/Commercial milestone skips — and the
  portfolio's categories. `projects.project_type` / `portfolio_projects.category`
  reference it (renames cascade).
- `project_progress()` returns the format's rules (`format`); `computeProgress`
  reads them, so a new format (e.g. a stage show with "Rehearsals" and
  "Opening night") works without a code change.
- `FormatPicker`: format cards with the selected format's journey (its phases
  and starting script format). Used when starting a project and — new — from
  the phase panel, where the owner can change a project's format.
- Also: shared `Textarea` label is a real `<label>`; floating labels use the
  readable accent; new-project modal passes axe (now checked in CI).

## Earlier — One crafts list

Migration `20260927020000_crafts.sql` — applied to production; PR #62 merged.

- `crafts` (49 crafts in 12 departments, admin-extendable) replaces the three
  disagreeing hardcoded lists (Jobs, profile editor, Crew directory).
  `profiles.role` / `jobs.role` reference it (renames cascade); legacy
  `creator`/`admin` profile values cleared; free-text mapped (Cinematographer →
  Director of photography, Sound Designer → Sound designer…).
- `project_crew.craft` added; `role` is now only the permission level
  (`lead`/`contributor`/`viewer`). Hiring from a job keeps the job's craft
  (it used to become "contributor"). Budget lines posted as jobs pick the
  closest craft (`suggestCraft`).
- `CraftPicker`: searchable, department-grouped popover (no 49-option select).
  Jobs filter lists only crafts that have postings.
- Editor fixed-height shell (the page scrolled when the breakdown panel grew,
  pushing the script under the header); tag bar laid out in columns.

## Latest Session — Phase engine + the breakdown, in the script

Branch: `claude/state-assessment-testing-r0tf3y` (PR #60). Migrations
`20260927000000_project_progress.sql` and `20260927010000_breakdown.sql` are
**not yet in production** — apply both before merging.

- **Phase engine** (`lib/os/progress.ts`, `project_progress()` RPC): milestones
  read from project data, tools unlock by phase or early once their work
  starts, owner moves phases, unlock reveal, logline editor, Studio tabs gated
  with "Open it now".
- **Breakdown as data** (replaces guessed `scenes.elements` + hardcoded rates):
  per-project `breakdown_categories` (seeded defaults, editable), one
  `breakdown_elements` row per thing (status, cost, owner, notes),
  `scene_elements` tags, `breakdown_dismissals`; `tag_scene_element()` finds or
  creates. Parser guesses are only *suggestions* (`lib/breakdown`).
- **Editor tag mode** (Ctrl+Shift+B): tagged elements highlighted in category
  colour, suggestions underlined; select words → floating tag bar (Alt+1–9);
  Breakdown tab: scene tags, suggestions, quick tag, element card (status,
  cost, owner, notes, scenes).
- Both migrations are **applied to production** (fingerprint matches on all
  12 categories); PR #60 merged.

## Latest Session — The breakdown drives the Studio

Branch: `claude/state-assessment-testing-r0tf3y`. No migrations.

- **Studio › Production › Breakdown**: by category / by scene (breakdown
  sheets), status filters, search, element card; **Categories & rates**
  (names, colours, order, unit costs); **Push to budget**
  (`Breakdown · <category>` lines); printable breakdown sheets.
- **Stripboard** replaces the day-number inputs: drag strips between days
  (or Alt+←/→), pages vs the owner-set day length, company-move warnings,
  cast per day, call-sheet dates, status dots, Day out of days, auto-schedule
  at the day length.
- Removed: `lib/scriptos/breakdown.ts` + `lib/supabase/breakdown.ts`
  (count × hardcoded rate, cast × $500, pages × $200), the old
  `ProductionBoards` stripboard, the schedule's guessed-element chips. The
  project page's budget now updates from the breakdown.
- Next: `scenes.elements` (parser guesses still stored by the scene sync) can
  be dropped; roles/departments taxonomy shared by Jobs, profiles and Crew;
  project types/phases as data.

## Latest Session — Post-production

Branch: `claude/state-assessment-testing-r0tf3y`. Migration
`20260926050000_post_production.sql` (not yet in production). Audit parts 1
and 2 are merged and applied; production matches `main` on every fingerprint
category.

- **Studio › Post**: cut review (link or library video; timecoded notes with
  department + scene, resolve/reopen, click-to-seek; "Now" from YouTube,
  Vimeo and library players) and the post pipeline + deliverables (status,
  due, owner; standard set on one click). Scene cards show open post notes.
- Also in part 2 (merged): Spotify sign-in hardening (OAuth state, crypto
  PKCE, tokens tied to the app user), live mood searches, admin analytics
  platform-wide, portfolio media/players for YouTube/Vimeo/Drive, custom
  avatars load.

Accessibility: every page passes WCAG 2.2 A/AA (axe-core) signed out, signed in,
admin and mobile — from ~800 violations to 0 — and CI now enforces it
(`e2e/accessibility.spec.ts`; rules in `design-tokens.md`).

Queued (user):
the phase-unlocked "Lego" ecosystem — design from the suite's dream users
(writers, directors, producers, crew, editors, composers, the community)
before building.

## Latest Session — Audit, part 2: production records that were never saved

Branch: `claude/state-assessment-testing-r0tf3y`. Verified: 106 integration
tests, 171 unit tests, tsc/lint/build, Studio journey + screenshots of the
new flows against the local stack. Migration `20260926040000` is **not yet
applied to production** (part 1, `20260926030000`, is applied and production
matches `main` on every fingerprint category).

- **Margin notes route to real work** (`add_script_annotation`, one
  transaction): Shot → numbered shot on that scene, Beat → beat board,
  To-do → project task. Labels say where each goes.
- **Shot list** per scene in Studio › Scenes (size, description, status),
  live; shots are pinned to their scene's project.
- **Editor stash persists** (`script_stash`, access follows the script,
  live); `scripts.stash_items` dropped.
- **Call sheets are saved**: date, calls, wrap, address, weather, notes,
  per-person call times; printout uses them (and names crew correctly).
- **Tasks** get assignee (notified) + due date.
- **Reduce motion** applies app-wide (framer-motion too).
- Profile "open script" opens that script.

Next: Spotify rebuild (server-side tokens; live mood search instead of
unverifiable editorial playlist ids, one of which was duplicated);
post-production module; integrations; design/motion pass.
`studio_boards`/`studio_assets` (2 orphan rows) still to drop.

## Latest Session — Suite audit: privacy, open doors, fake UI

Branch: `claude/state-assessment-testing-r0tf3y`. Verified: 94 integration
tests (personas), 169 unit tests, tsc/lint/build, Studio journey in a real
browser against the local stack. Migration `20260926030000` is **not yet
applied to production** — apply it right after the code deploys (the old
code selects `profiles.*`, which the migration forbids).

Fixed (security):
- `is_admin` self-grant (migration `20260926020000`, applied; admins reset).
- "Private" wasn't private for crew on older tables; crew lists were empty
  for non-owners (they only saw their own row).
- Notifications forgeable (any user → any user, any link).
- Project soundtrack notes, `script_notes` and private profile fields
  (admin flag, notification prefs, Discord id) readable by everyone.
- Project script access outlived crew membership (via `last_edited_by`);
  anyone could add scripts to any project; shared scripts' characters
  writable by everyone; audit log forgeable; any user could upload anything
  to four public buckets; outsiders could react to any channel message.

Fixed (truth): project cards (fabricated deadline/team/progress), project
hub (phase-derived "% complete", empty team, decorative previews), Lounge
"crew" (first 20 site profiles), Lounge chat not live, production feed read
a table nothing writes; hub/settings saves that ignored errors now roll back;
crew no longer see owner-only controls; one budget estimator.

Next (audit list): reduce-motion everywhere; annotations "routes to" wired
to real destinations (shot list, beats, tasks); call sheets persisted;
editor stash persisted; profile "open script" link; soundtrack duplicate
playlists; task assignee/due date; post-production module; integrations;
design/motion pass. `studio_boards`/`studio_assets` still to drop.

## Latest Session — The Studio, rebuilt: one library, scenes that follow the script, share links

Branch: `claude/state-assessment-testing-r0tf3y`. Verified: 68 integration
tests (personas, storage, realtime), 167 unit tests, tsc/lint/build, and the
Studio journey in a real browser against a local stack (also in CI).

- **One project library** (`media`, private `project-media` bucket) replaces
  three disconnected systems (`concept_assets`, `project_assets`,
  owner-only `studio_assets`). Upload files or add links (YouTube/Vimeo embed),
  Openverse search, boards, filters, detail view. Shared with crew, live.
- **Scenes follow the screenplay** (`scenes.script_id`, `sync_script_scenes`):
  ids stay stable through rewrites, so references, notes, colours, shoot days
  survive edits. Scene notes/colours moved from device-only localStorage into
  the DB (one-time migration of existing device notes).
- **References everywhere**: Studio → Scenes, and the editor's new **Refs** tab
  (current scene's media, add/upload on the spot, note, colour).
- **Share & pitch**: visibility (Private/Team/Link/Public), copy link,
  per-item publish (owner only), server-rendered lookbook with link previews,
  `/m/<id>` permalinks, Showcase lists Public projects' published media.
- **Studio rebuilt** on a typed provider + CSS module (the 90-field `any`
  context is gone); Production (story, schedule, cast & crew), Promos, Pitch
  ported to the new data.
- **Realtime publication** now includes the tables the app live-syncs
  (projects, crew, budget, timeline, beats, campaigns, notifications,
  activity, scenes, media, links) — before, those subscriptions never fired.

Bugs found and fixed on the way: activity feed readable by every signed-in user
(beat titles, scene headings — now scoped per project, backfilled);
`scenes.time_of_day` rejected CONTINUOUS/LATER headings (whole-script imports
failed); editor opened the server copy of a project script over unsynced local
edits; "platform stats" were per-user RLS counts; `in-production` projects
showed as Development; `next/image` on arbitrary hosts crashed public portfolio
pages with YouTube or external images; "Public" promised discovery that didn't
exist (now true via the Showcase).

Removed: "Push beat to ScriptOS" (created a separate script per beat; a safe
append needs server-side merge with unsynced editor edits — follow-up).

Open: crew can still read child tables of *private* projects on older tables
(they use `is_project_member`, not `can_access_project`); `studio_boards`/
`studio_assets` (2 orphan rows) to drop; post-production workflow; Spotify /
Pinterest / YouTube integrations; design & motion pass.

## Latest Session — Foundation: migrations as truth, drift gate, real-DB persona tests

Branch: `claude/state-assessment-testing-r0tf3y`. Verified: CI `database` job
sequence from a clean stack (drift ✓, types ✓, **18 integration tests** ✓),
tsc/lint/133 unit tests/build ✓.

- **`supabase/migrations/` is now the schema source of truth.**
  `20260926000000_baseline.sql` reconstructs production object-by-object from
  the live catalog; proven identical to production across 14 object categories
  (1,049 objects: columns, constraints, indexes, RLS, 129 policies, 16 function
  bodies, grants, triggers, views, buckets, realtime). Root `supabase-*.sql`
  files (drifted) are deleted; docs rewritten (`database-and-security.md` §3).
- **Drift gate:** `supabase/fingerprint.sql` + `scripts/db-drift.mjs` +
  committed `supabase/schema.fingerprint`. `npm run db:drift` fails CI if the
  migrations don't build exactly the snapshot; `--target` checks a deployed DB
  (`.github/workflows/production-drift.yml`, needs `PRODUCTION_DB_URL` secret).
- **Generated types are gated:** `npm run db:types` (pinned CLI + prettier,
  deterministic); CI fails if `database.types.ts` is stale. Regeneration removed
  three `as any` casts and caught one real null-into-NOT-NULL write.
- **Real-DB integration tests** (`tests/integration/`, `npm run test:integration`):
  Sam/Jordan/Riley/anon as real accounts through PostgREST + RLS. Covers project
  visibility + share links, script content + metadata access, signup → profile.
  Verified they fail when the old link-leak policy is reintroduced.
- **Production bug found + fixed (migration `20260926000100`):**
  `internal.can_access_script` called non-existent `public.is_project_*`, so
  every title-page / character-bible / revision read or write failed for all
  users. Test fails before, passes after. **Must be applied to production.**

Found, not yet fixed (next): realtime publication only covers chat/presence/
collab — the app's project & notification live-sync subscriptions can never
fire; `scripts.stash_items` exists but the editor stash is memory-only; scene
notes/colours are device-only localStorage; 112 direct DB calls in UI files.

## Latest Session — Sign-in persistence + no-silent-data-loss saves

Branch: `claude/state-assessment-testing-r0tf3y`. Verified: **133 tests pass**
(8 new), tsc/lint/build green, 20/20 CI smoke specs; real-browser journey on
the build: sign in → all 11 apps stay signed in → create project → Studio →
write in editor → reload → text and project present (confirmed in the DB).

Production (pre-fix) reproduction: sign-in left no session cookie and every
app bounced to /auth. Fixes:
- **Boot adopts the local session instantly** (`bootOS` → `getSession()` then
  `osAdoptSession`); `getUser()` validates in the background and signs out only
  on an explicit 401/403. Sign-in/up no longer block on profile + projects +
  sync (`osAdoptSession`) — previously any slowness stranded the user on /auth.
- **Auth form can't leak credentials**: `method="post"` + submit disabled until
  hydrated (pre-hydration native submit put the password in the URL).
- **Service worker v2**: no homepage fallback for failed navigations (it
  rewrote the URL to "/"), never caches redirects, purges v1 caches.
- `useOSGate` keeps `?redirect=`; nav hides Sign In/Out while identity loads.
- **Editor data loss fixed** (`lib/scriptos/storage.ts`): load prefers unsynced
  local edits over the stale server copy; failed saves retry on a timer (not
  only on `online`); sync no longer clobbers text typed mid-upload. Status bar
  shows "On device — syncing" instead of always "Saved"; one-time toast.
  Pinned by `storage.test.ts` (2 of 4 fail on the old code).
- Project creation uses the live session; activity logging is fire-and-forget
  (it blocked navigation to Studio when slow).

## Latest Session — Live assessment + fixes for the blocking bugs

Branch: `claude/state-assessment-testing-r0tf3y`. Report:
`docs/STATE_ASSESSMENT_2026-09.md`. Verified: **123 tests pass** (5 new),
tsc/lint/build green, 20/20 CI smoke specs pass locally.

- **Identity race fixed at the source** (`lib/os/boot.ts`): `getUser()` is
  bounded (8 s, then local session) and a profile-read failure retries, then
  falls back to a minimal identity. A valid session can no longer resolve to
  `anon`, which was what made signed-in users look signed out and the editor
  drop writes. `lib/os/boot.test.ts` pins it (3 of 5 fail on the old code).
- Editor toasts if it cannot open a script instead of failing silently;
  `/projects` no longer gives up on identity after 12 s.
- `/showcase` crash fixed: 3D gallery (R3F v8, incompatible with Next 15's
  React 19) replaced with a 2D grid; `three`/fiber/drei removed.
- **Visibility migration corrected and APPLIED to prod** (`project_visibility_and_share_links`):
  private = owner only; no anon row access; share links resolve via
  `get_shared_project(token)`. Persona SQL (owner/crew/outsider/anon) verified.
- Spotify `.maybeSingle()` (no more 406 per page); browser network errors map
  to "Unable to connect"; `route-smoke` added to CI (stale `/settings` test fixed).

Still open: security advisors (incl. the intentional anon-executable
`get_shared_project`), public storage buckets, generated types not regenerated
for `visibility`/`share_token` (code casts), `sync-intel` broken by a missing
`.claude/skills/supabase` path.

## Latest Session — Project visibility model, global activity, parser consolidation

Branch: `chore/visibility-activity-consolidate`. Verified: **118 tests pass**;
`next build` green (zero warnings). No AI.

### 1. Project visibility (private / team / link / public)

`supabase-migration-project-visibility.sql` + schema + app:
- `projects.visibility` ('private' owner-only / 'team' crew (default) / 'link'
  anyone with the token / 'public' anyone) + `share_token` (backfilled).
- Level-aware RLS (private→owner only; team→members; link→anon with token;
  public→anon). `is_public` kept in sync for legacy readers.
- Hub header: owner-only visibility selector + "Copy link" when `link`, linking
  to a new **public** `/shared/[token]` route (read-only overview; scenes/budget/
  chat stay member-gated). Portfolio stays the manual pitch board as requested.
- **Action needed:** the migration must be applied on the live DB (this
  environment can't run DDL). The app casts the new columns until generated
  types are regenerated post-migration.

### 2. Activity logging is now global

`logActivity` wired at every meaningful mutation across the suite (previous
pass covered casting/beats/campaign/breakdown/scenes): crew invite, job opened,
asset uploaded, pitch board published — on top of projects/studio/jobs feeds.
The Studio Overview feed now reflects real work.

### 3. Consolidation — one parser, not two

`lib/scriptos/validator.ts` used a **second private parser**
(`lib/advanced-parser.ts`) that disagreed with what the editor renders, causing
phantom lint diagnostics. Rewrote its structure checks (scene density,
character-intro, monologue, Act-I pacing) on the shared parser's
scenes/characters (the same the editor and Studio use) and **deleted
`lib/advanced-parser.ts`**.

## Prior Session — Suite completeness: cross-tool sync, skeletons, dead code

Branch: `chore/suite-completeness`. Verified: **118 tests pass**; `next build`
green (zero warnings). Offline, no AI, no new deps.

Full sweep for "things connected in code but not in the product":

- **7 missing route skeletons added** — `studio` (the heaviest page), `jobs`,
  `crew`, `portfolio`, `soundtrack`, `settings`, `profile`. Previously only
  `projects`/`editor`/`lounge` had `loading.tsx`, so navigating into Studio (or
  any of the others) flashed blank instead of showing structure.
- **Casting → Jobs is now a real handoff.** Studio's casting board "Post to
  Jobs →" just linked to `/jobs`; it now passes `?title=&role=Actor`, which the
  Jobs page already supports (it auto-opens the post modal prefilled), and the
  job inherits `project_id` from the active project.
- **Activity feed actually fed.** The Studio Overview "Recent Activity" panel
  was fed by only 2 call sites (project create / phase move). Now logs:
  scene wrapped, scenes imported from screenplay, breakdown→budget synced, beat
  added, campaign launched, performer cast / casting reopened. Action strings
  read as verb phrases to match the feed's `{user} {action}` rendering.
- **Crew role changes now notify the member.** `updateCrewMemberRole` only wrote
  an admin audit-log row; the affected member was never told. Now sends a
  `crew` notification with a deep link to the project.
- **Removed dead + rule-breaking code:** `handleAddBeat` / `handleDeleteBeat` /
  `handleDeleteAsset` in `app/studio/page.tsx` were never passed into
  `StudioCtx` (unreachable), and `handleAddBeat` used native `prompt()` — an
  AGENTS.md violation. Deleted; the live paths are ProductionTab's inline beat
  form and AssetsTab's own delete. Dropped the now-unused
  `createProjectBeat`/`deleteProjectBeat` imports.

### Audit findings NOT fixed (need an owner decision)

1. **Portfolio "verified credits" is not implemented.** `studio-and-preproduction.md`
   claims public portfolios "pull direct production history from actual,
   completed Misfits Cavern projects, ensuring credentials are verified and
   authentic." Reality: `portfolio_projects` is a **manually assembled pitch
   board** (blocks added by hand). Auto-populating credits from a user's
   completed projects is a real feature, not a wiring fix — it needs a product
   decision (which projects count, what a "credit" shows, privacy of private
   projects).
2. **`logActivity` is still partial** — casting/beats/campaign/breakdown/scene
   are covered; asset uploads, crew invites, script revisions and portfolio
   publishes are not. Worth finishing in a follow-up.
3. **`lib/scriptos/schedule.ts` vs the inline scheduler** in `studio/page.tsx`
   remain two implementations (the lib one now also powers the Schedule tab's
   breakdown card). Consolidating them is a small follow-up.

## Prior Session — Deterministic analysis engine (the "neural-inspired" layer)

Branch: `chore/analyze-engine`. Verified: **118 tests pass** (4 new); `next build`
green (zero warnings). Offline, no AI, no new deps.

`lib/scriptos/analyze.ts` — `analyzeScript(parseResult)` returns, with the rule
that produced each result and a confidence (explainability is the point):

- **Entity disambiguation** — ALL-CAPS action tokens resolved to
  `character` (if a cast member — "BRICK" is a person, not a prop) /
  `vehicles` / `wardrobe` / `sfx` / `vfx` / `props`, with an extra suffix vocab
  (`PICKUP`, `BLAZER`, …). Fixes the "names tagged as props" noise.
- **Continuity flags** — duplicate scene headings (warn), silent characters
  (info), scenes with no established location (info).
- **Pacing** — scene count, est. runtime, dialogue ratio, avg scene words,
  time-of-day histogram.

Exposed `KNOWLEDGE` / `BREAKDOWN_STOPWORDS` from the parser so the analyzer
reasons over the same vocabulary. `lib/scriptos/analyze.test.ts` pins
disambiguation, explanation strings, flags, and pacing.

### The on-device neural upgrade (next, opt-in)

This is the *deterministic* floor. The true "neural" step is a lazy
`transformers.js` dynamic import (runs in-browser via WebGPU/ONNX — no server,
no egress, model cached by the service worker) doing NER / zero-shot
classification behind `analyzeScript`'s interface, with the deterministic engine
as the fallback. That's a dependency + ~100–400MB opt-in model download, so it
wants its own PR with a feature flag; wired so it can never regress the offline
path. UI wiring (surface the analysis in the Studio) is also the next slice.

## Prior Session — Script→suite bridge: real breakdown elements + budget core

Branch: `chore/suite-bridge`. Verified: **114 tests pass** (4 new); `next build`
green (zero warnings). No AI, no new dependencies, offline.

The bridge (screenplay → breakdown → scenes → budget → casting) was wired but
produced almost nothing: the parser's element tagger matched a tiny hardcoded
vocab, so `parseScript(...).scenes[].elements` came back `{}` on a real scene.

- **Deterministic element extraction** (`extractElementsFromAction`): reads the
  ALL-CAPS runs in *action* text — the industry convention for tagging
  production elements — skips stopwords and the scene's own character names,
  categorises with the existing dictionaries, and defaults unmatched items to
  the props bucket. Dialogue never feeds it. Wire into `extractScenes` (replaces
  `tagElements`).
- **Pure breakdown core** (`lib/scriptos/breakdown.ts`): `aggregateElements` +
  `computeBudgetLines` (count × per-category rate). `lib/supabase/breakdown.ts`
  is now a thin adapter over it (same exports, so callers are unchanged).
- **`analyzeCharacters`** now uses the parser's resolved `characterName`, so
  `@MAYA` and `STEEL (beer raised)` produce a clean character, not `@MAYA`.
- `lib/scriptos/breakdown.test.ts` pins: categorisation (GLOCK→props,
  TRENCHCOAT→wardrobe, GUNSHOT→sfx, SMOKE→vfx), name-leak rejection,
  aggregation, budget synthesis (count × rate + no phantom "Vehicles (0)" line),
  and the empty-script case.

## Prior Session — Offline foundation: PWA shell, delete tombstones, offline session

Branch: `chore/offline-foundation`. Verified: **110 tests pass**; `next build`
green (zero warnings). No AI, no new dependencies.

Closes the gap between "the parse/edit path is already network-free" and "the
app actually works offline":

- **PWA shell** — `public/sw.js` (network-first navigations with cache fallback,
  cache-first `/_next/static`, stale-while-revalidate images/fonts, cross-origin
  never intercepted), `public/manifest.webmanifest`, `public/icon.svg`,
  `components/ServiceWorkerRegister.tsx` (prod-only), and layout `manifest` /
  `themeColor` metadata. The app can now load and reopen offline after a first
  visit.
- **Delete tombstones** — `deleteScript` records the id locally and replays the
  server delete on the next `syncPendingScripts` (replayed first, so a delete
  wins over any queued upsert); `getAllScripts` filters tombstones. Deleting
  offline can no longer resurrect on reconnect, and deleted content doesn't
  linger on the server.
- **Offline session** — `boot.ts` now uses `getOfflineSafeUser()` (`getUser()`
  with a `getSession()` fallback, since the former is a network-validating call)
  and `resolveSessionUser` falls back to a **device-level cached profile**
  (`localStorage 'mc_offline_profile'`). A returning signed-in user boots as
  `authed` with no network instead of being bounced to `/auth`. `osHydrateSession`
  and `bootOS` both route through it.

Combined with the existing `syncPending` outbox in `saveScript`, the core write
loop is now: save locally first → sync when back online. The one thing still
needing a real-device check is an airplane-mode cold start through the full
journey (Playwright `context.setOffline(true)` is the natural harness for it).

## Prior Session — ScriptOS: Normalize formatting + canonical Fountain export

Branch: `chore/scriptos-normalize`. Verified: **110 tests pass**; `next build`
green (zero warnings). Offline, no AI.

- `exportScriptAsText(…, 'fountain')` now downloads a **canonically-formatted**
  Fountain document (parse → serialize) instead of a raw content dump; `.txt`
  stays the author's source verbatim.
- Added a **"Normalize formatting"** action to the editor's Export dropdown. It
  runs `canonicalizeFountain(content)`, commits a history entry first so it is a
  single undo away, and toasts when the document is already canonical. Exposed
  through `EditorCtx.handleNormalize`.

## Prior Session — Fountain serializer + round-trip proof (Stage 1 complete)

Branch: `chore/fountain-serializer`. Verified: **110 unit tests pass** (4 new
round-trip tests), `next build` green (zero warnings). Offline, no AI.

- `lib/scriptos/fountain-export.ts` — a real **Fountain writer**
  (`serializeLine` per element + `serializeFountain` + `canonicalizeFountain`),
  closing the "reader but not writer" gap. The old `exportScriptAsText(...,
  'fountain')` was a raw content dump; this is the canonicalizer that doubles as
  the auto-format engine.
- **Round-trip contract, proven by test:** `parse(serializeFountain(parse(x)))`
  loses nothing at the *structural* level — same element-type sequence, same
  scenes (+ scene numbers + cast lists), same named characters. Fixed a subtle
  slug bug the property caught (a `#1#` strip left a trailing space → double
  space before the scene number).
- Canonical emission per element: forced markers resolved to their standard
  form (`.slug`, `@character` → bare word, `> transition`, `> centered <`,
  `~lyric`, `= synopsis`, `# section`, `[[ note ]]`, `/* boneyard */`, `^`,
  `===`), and an ALL-CAPS action is emitted with `!` so it can never re-parse
  as a character cue.
- `canonicalizeFountain` is **idempotent** (fixed point) — normalizing twice
  changes nothing, which is the property that lets a future "Normalize" button
  be safe to press.

Still deferred (as flagged): emphasis rendering in the *write* surface (rich
text), and wiring `canonicalizeFountain` to a UI action / the Fountain export
path. The suite bridge (breakdown → schedule → budget) re-hydrates from the
now-correct scene/element data.

## Prior Session — Fountain conformance layer on the parser (Stage 1, offline, no AI)

Branch: `chore/fountain-conformance`. Verified: `next build` green (zero
warnings), **106 unit tests pass** (12 new Fountain conformance tests).

- Ran a Fountain torture-test through the real parser and fixed **15 concrete
  correctness defects**, all deterministic/offline. The big one: a character cue
  with an inline parenthetical — `STEEL (beer raised)` — was misread as `action`
  because `isCaps()` tested the *whole line* instead of the name, silently
  corrupting dialogue attribution **and** scene cast lists. Now: name-part
  evaluation, correct `characterName`, cast lists populated.
- Added a **spec layer (`preClassify`)** that resolves unambiguous Fountain
  syntax *before* the scored heuristic, so forced elements can't be overridden:
  forced scene heading (`.`), forced character (`@`), forced action (`!`),
  forced transition (`>`), centered (`> <`), lyrics (`~`), synopses (`=`),
  sections (`#`), page breaks (`===`), notes (`[[ ]]`), and **boneyard (`/* */`)**.
- Scene numbers `#1#` now extracted; forced-slug heading strips the leading `.`.
- Dual dialogue: the `^` caret is typed `dual` (not a bogus dialogue line) and
  marks both the preceding and following blocks `isDualDialogue`.
- Added `LineType` members: `note | lyric | section | synopsis | dual |
  pagebreak | boneyard`. Preview now renders them honestly (boneyard struck,
  notes muted, sections bold, centered/lyric/synopsis styled, `^` hidden,
  page break shown as a gap) — no raw `#`/`===`/`/*`/`^` markup in preview.
- Boneyard is **typed, not discarded** (lossless round-trip: every source line
  still maps to one parsed line); fountains that drop it are a *render/export*
  concern, which is the next increment (serializer).
- `lib/scriptos/fountain.test.ts` pins all of it (source-losslessness, scene
  numbers, forced markers, cast lists, dual dialogue, boneyard/notes/sections).

### What "comparable to Fountain" still needs (not done)

`emit.ts` (a real serializer — the Fountain export is still a raw dump) and the
round-trip property harness; emphasis-mark rendering in the *write* surface is
rich-text work and stays for later. Then the suite bridge (breakdown → schedule
→ budget) re-hydrates from the now-correct scene/element data.

## Prior Session — Auth journey tested live; post-login redirect + hydration race fixed

Branch: `chore/auth-journey-fix`. Verified: `next build` green (zero warnings),
94 unit tests pass, and a **live end-to-end run** against the real Supabase
project (3/3 passing).

### What was actually tested (not assumed)

Added `e2e/auth-journey.spec.ts` — opt-in (`E2E_LIVE_AUTH=1`) because it creates
real accounts. It drives the real form and the real backend. Findings:

- **Account creation works.** `/auth/v1/settings` reports
  `disable_signup: false`, `mailer_autoconfirm: true`; signup returns a session
  immediately, and the `on_auth_user_created` trigger creates the profile row
  (verified the new row, username taken from signup metadata).
- **RLS holds for a brand-new user**: 0 projects visible, and creating one
  returns 201 with default project settings.
- **All 10 authed surfaces opened for a fresh account** — `/projects`, `/studio`,
  `/editor`, `/lounge`, `/soundtrack`, `/portfolio`, `/crew`, `/jobs`,
  `/settings`, `/profile` (recorded in the run log; no surface bounced).
- **Schema reconciliation confirmed against live**: `script_annotations` exists,
  `scenes.elements` exists, `beats` + `marketing_campaigns` are gone.

### The real bug that was found and fixed

`middleware.ts` correctly sends gated visitors to `/auth?redirect=<path>`
(observed: `/auth?redirect=%2Fstudio`), but the auth page **ignored it** and did
`setTimeout(() => router.push('/projects'), 600)`. Two defects in one line:

1. Deep-linked users (e.g. opening `/studio` while logged out) were always
   dumped on `/projects` instead of their destination.
2. The blind 600 ms timer raced the async session resolution. `useOSGate()` on
   the destination reads the OS store, so if the store still said `anon` the
   page bounced straight back to `/auth` — and `/auth` had no "already signed
   in, move along" behaviour, so the user sat stranded on the sign-in form. That
   is the "sometimes looped" report.

Fixes:
- `osHydrateSession()` (`lib/os/boot.ts`, exported through `lib/os`) resolves
  profile + projects into the OS store. `osSignIn`/`osSignUp` now **await** it,
  so the store is authoritative before any navigation happens.
- `osSignUp` settles back to `anon` when signup returns no session (the
  email-confirmation path), instead of stranding the store in `resolving`.
- The auth page navigates on the store reporting `authed` — no timer — and
  honours `?redirect=` (same-origin absolute paths only; `//` and `/auth`
  rejected), so a signed-in visitor to `/auth` is also forwarded onward.
- Signup with confirmation enabled now keeps the user on `/auth` and tells them
  to confirm, rather than bouncing into a gated page.

### Resolved finding — `profiles.is_admin` was world-readable (fixed in `20260926030000_privacy_and_integrity.sql`)

Reading `profiles` as a brand-new account returned **every** profile row,
including accounts with `is_admin: true`. `profiles` has
`SELECT USING (true)` (the public crew/showcase directory depends on that), but
`is_admin` leaks admin identity and enables user enumeration.

Not fixed here on purpose: a column-level `REVOKE SELECT (is_admin)` breaks the
five `select('*')` call sites — including `lib/os/boot.ts`, which drives
permissions — so the correct fix is either (a) `internal.is_admin(uid)` exposed
to the client plus explicit column lists everywhere, or (b) moving the flag to a
separate table readable only by admins/self. That is an RLS change with persona
testing, so it wants its own PR.

### Also

- Test accounts created by the verification were **deleted** afterwards
  (projects, then dependent rows — `scripts_last_edited_by_fkey` blocks the
  user delete — then the auth users). 0 probe accounts remain. Note: ~8 older
  `mctestuser*` / `logintest*` / `qa*` accounts from previous sessions are still
  in the project; they were left alone as they are not ours to judge.

## Prior Session — Scheduler wired into the UI, unused deps dropped

Branch: `chore/scheduler-and-deps`. Verified: `next build` green with **zero
lint warnings**, 94 unit tests pass.

- **`lib/scriptos/schedule.ts` is no longer dead code.** It was referenced only
  by its own test while the real auto-scheduler lived inline in
  `app/studio/page.tsx`. The Studio page now runs the tested
  `generateShootingSchedule` over the parsed screenplay and the Production →
  Schedule tab renders a **Script Breakdown** card from it: scene count,
  estimated runtime, unique locations, unique characters, word count, and the
  top location groups ranked by scene count with per-group minute estimates.
  Derived from what is *written*, so it is useful before anything is imported
  into the scene list. Added an exported `ShootingSchedule` type rather than
  threading `any` through `StudioCtx`.
- **Dropped the two unused dependencies**: `tailwind-merge` and `recharts`
  (zero references in app/lib/components/config). 39 packages removed.
- Fixed a `react-hooks/exhaustive-deps` warning introduced by the new effect
  (project id captured outside the effect, used as the dependency).

## Prior Session — Dead-code purge, zod validation layer, doc/schema reconciliation

Branch: `chore/production-hardening`. All verified: `tsc --noEmit` clean,
`npm run lint` clean, **94 unit tests pass** (was 63), `npm run build` green.

- **Cleaned a broken local environment first** (this had been silently blocking
  local verification): `node_modules` had a corrupt `@next/swc-win32-x64-msvc`
  binary and a missing `lucide-react` .d.ts, so `npm run build` failed locally
  even though CI was green. Full clean `npm ci` fixed it. `next.config.js` now
  pins `outputFileTracingRoot` so a stray `package-lock.json` above the repo
  can't be picked as the workspace root.
- **Deleted 23 verified-dead modules** (zero inbound references, checked by
  basename scan *and* import-graph scan): `lib/scriptos/{advanced-formatter,
  auto-save,editor-utils,export-pro,fountain-export,parser.worker,pdfGenerator}.ts`,
  `lib/{api-validation,network-retry,useScript,animations/variants}.ts`,
  `components/{AnimatedText,CrewManagementModal,LoungeDock,MagBtn,PageTransition,
  PhotoScatter,RoleBasedNav,NetworkStatus}.tsx`, `components/canvas/{CanvasPin,
  PannableCanvas}.tsx`, `components/editor/DiffModal.tsx` (restored — see below),
  `lib/hooks/useNetworkStatus.ts`. Dropped unused deps `tailwind-merge` +
  `recharts` — **not done yet, see "Not done" below.**
- **Revision "View" button was a native `alert()`** and `showDiff`/
  `diffRevisionId` in `app/editor/page.tsx` were dead, never-wired state — a
  half-implemented feature. Fixed properly: restored `DiffModal`, wired it to
  the revisions panel (`onViewRevision`), and removed the `alert()`. Zero
  native `alert()`/`confirm()` remain in the app (every `confirm(` left is the
  shared `useConfirm()` hook).
- **Zod (v4) implemented** as the single validation seam: new
  `lib/validation/index.ts` (schemas + `parseJsonBody`/`firstIssue`/`issueMap`,
  types derived with `z.infer`). Wired into all three API routes —
  `/api/discord/notify` (body), `/api/discord/test` (body), and
  `/api/references/search` (query) — and into the auth form (sign-in/sign-up).
  31 new unit tests cover the schemas, including lookalike-host webhook
  rejections. Replaced the hand-rolled `lib/api-validation.ts` (which was dead).
- **Security hardening found by that work:** `/api/discord/test` had **no auth
  and no rate limiting** even though `RETROSPECTIVE_2026-07.md` claimed it was
  fixed. Now requires a Bearer token + is rate limited (caller updated to send
  the token). `/api/references/search` is now rate limited too. `/api/discord/
  notify` re-validates the stored webhook URL before fetching it (SSRF guard)
  and no longer uses `!`-asserted env vars.
- **Schema reference reconciled** (`supabase-schema.sql`): helpers moved
  `public.*` → `internal.*` (matching live + all docs; `public.*` was dropped on
  live and caused the documented 42883 outage), added `CREATE SCHEMA internal`
  + REVOKE/GRANT, added the missing `script_annotations` table and
  `scenes.elements` column (both used by live app code but absent from the
  reference), and removed the two dead `beats`/`marketing_campaigns` tables.
  The previously **untracked** redesign migration is now committed as
  `supabase-migration-cavern-suite-redesign.sql` (was a schema-mirror gap).
- **Intelligence hub repaired**: restored the 8 `.cavern-intelligence/*.md` docs
  that `AGENTS.md`/`INDEX.md` referenced but PR #39 had deleted, and restored
  `scripts/sync-intel.js` + the `npm run sync-intel` script they instruct agents
  to run. Fixed real drift in the *new* docs: `conventions.md` pointed at the
  deleted `lib/permissions/` tree and claimed `strict: false` (it is `true`);
  `routing-and-surface.md` documented `AuthProvider`/`ProjectProvider` (the
  app mounts `OSProvider`) and listed chrome components that aren't mounted;
  `tools-and-access.md` described CI env as secrets (they're `vars.*`).
- Manifest regenerated: 201 tracked files.

### Not done in this session (needs owner or infra)

1. `tailwind-merge` + `recharts` are still in `package.json` (zero usages) —
   removal was deferred so this PR stays reviewable.
2. `lib/scriptos/schedule.ts` is referenced **only by its own test**; the real
   auto-scheduler lives inline in `app/studio/page.tsx`. Either wire the lib
   function into the UI or delete it — decided to leave for the owner.
3. Persona e2e in CI (Sam/Jordan/Riley) — needs a seeded Supabase test project
   (infra, flagged by both prior audits).
4. Production error sink (Sentry or similar) — needs a vendor choice.
5. Live-DB verification of the schema changes could **not** be run from this
   environment (no network access to `supabase.co`); the `internal.*` alignment
   is based on STATE.md history + `database-and-security.md` + `CLAW.md`.
   Worth one `list_tables` check.

## Prior Session — Harness access + intelligence hub rebuild

- **Committed Claude Code access config** (`.claude/settings.json`, was absent):
  `enableAllProjectMcpServers`; `allow` for safe dev/verify/git + read MCP tools;
  `ask` for consequential ops; `deny` on main-push / `.env*` / `sudo` / `rm -rf`.
  Per owner request, **`apply_migration` and `deploy_to_vercel` are now in
  `allow`** (no prompt) — the branch→PR→persona-test workflow is the safety net.
- **SessionStart hook** `.claude/hooks/session-bootstrap.sh` injects
  `AGENTS.md` + `STATE.md` every session (survives ephemeral containers).
- **Rebuilt `.cavern-intelligence/` into a full hub** — added `INDEX.md`
  (front door + read order), `tools-and-access.md` (MCP/permissions/skills/env),
  `routing-and-surface.md` (all 30 routes, gating tiers, providers, module
  ownership), `conventions.md` (data-access layer, toast/confirm, migrations,
  the "usually inline" patterns). Wired them into `AGENTS.md`'s Deep Context
  table; trimmed `CLAW.md`'s stale hard-coded state to defer to this file.
  Manifest regenerated → 266 tracked files.
- **CI blocker (unchanged, out of scope):** `next build` fails at
  `/api/discord/notify` because `NEXT_PUBLIC_SUPABASE_ANON_KEY` is blank in
  Actions secrets and the route eagerly builds a Supabase client. Fix = set the
  secret + lazy-init the client (the lazy-init already exists in PR #39). Not
  cherry-picked here per owner instruction.

## Active Iteration

Repo audit + hardening pass (Milestones 0–1 of the audit plan in `~/.claude/plans/you-are-a-world-class-typed-corbato.md`): CI pipeline, unit-test harness, Discord notify route auth, real middleware session validation.

## Last Change Summary

- **CI**: `.github/workflows/ci.yml` — typecheck + lint + vitest + build, plus unauthenticated Playwright smoke job. Needs `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` repo secrets.
- **Unit tests**: Vitest added (`vitest.config.ts`); 36 tests covering `lib/scriptos/parser.ts` and `lib/permissions/access-matrix.ts`. `npm run test`.
- **Security — notify route**: `/api/discord/notify` now requires a Bearer access token (401 otherwise), derives sender identity from the verified JWT (body `senderId` removed — spoofing closed), and 403s unless the caller can view the channel under RLS. Caller updated in `lib/supabase/messages.ts`.
- **Security — auth**: browser client migrated to cookie-backed `createBrowserClient` (`@supabase/ssr`); middleware now validates the session via `getUser()` (forged/expired cookies rejected) and gates `/admin` on server-verified `profiles.is_admin`. **Existing localStorage sessions are not migrated — all users sign in once more after deploy.**
- Quick wins: `typecheck`/`test`/`test:e2e` npm scripts; `updateProject` errors now surface via toast; debug `console.log` removed from ParticleBackground; Supabase image host in `next.config.js` derived from env.
- Fixed broken `e2e/auth-validation.spec.ts` (targeted nonexistent `/auth/signup` + label selectors that never matched) — now passes against the real `/auth` signup mode.
- `sync-manifest.json` at 220 tracked files.

## Second Pass (same session) — DB verification, types, drift fixes

- **Live RLS verified**: every public table has RLS enabled; anon (Riley) sees 0 rows in channels/channel_members/discord_integrations/messages.
- **Recovered + committed** the uncommitted `project_channels_system` DDL as `supabase-migration-project-channels-system.sql`.
- **Fixed a live production outage**: `can_post_channel` / `can_view_channel` / `can_manage_channel` referenced helpers by their old `public.*` names after they moved to `internal`, so all three raised 42883 — breaking the channels SELECT policy and every channel message insert. Fixed via prod migrations `fix_can_post_channel_schema_reference` + `fix_channel_helpers_internal_schema_references`; committed SQL matches.
- **Generated Supabase types** (`lib/supabase/database.types.ts`), client is now `createBrowserClient<Database>`; `Database = any` gone.
- Types immediately caught **4 schema-drift bugs**, all fixed: `scripts.page_count` (broke hub script count), `projects.is_public` (broke projectAccess loading in AuthContext), `sfx_assets` insert used 4 nonexistent columns + missing required `project_id` (every SFX upload failed), CommandPalette queried nonexistent `assets` table (now `project_assets`).

## Third Pass — full-suite logic audit (every page/button/query)

Three parallel audits verified ~180 buttons/actions and every `supabase.from()`
call across all 27 routes against the generated schema. Sign-in redirect loop
fixed and verified live in production (cookie-backed session + validating
middleware, commit 9e68493). Additional defects found and fixed:

- soundtrack SFX panel (5): consumed nonexistent `bucket_path`/`file_name`/
  `category` columns — uploads were unplayable, untitled, and unsavable to the
  Audio Bible. Now reads `audio_url`/`title`/`tags`.
- profile page: `jobs.company/location` don't exist — the select error blanked
  ALL profile lists and stat counts. Now selects `role`/`status`.
- jobs board: failed job post was silent — now toasts the error.
- CrewManagementModal: role dropdown now gated by `manage_crew` (was enabled
  for viewers and silently failed at RLS).
- admin/users: removed duplicate ANALYTICS tab link.

Clean areas: home, projects, project hub, pitch board, portfolio (+manage),
p/[token], s/[token], showcase, studio, editor + ScriptOS libs, Spotify,
lounge + channels + voice, jobs, crew, settings, admin ×4, auth ×3, taskbar/
nav/notifications.

## Known Issues

1. Leaked-password protection — dashboard toggle, owner must flip it (also flagged by security advisor)
2. README / production branding / docs polish — partial pass done, could use another round
3. `tsconfig.json` still `strict: false` (audit plan M2.2)
4. `npm audit`: 5 vulnerabilities (1 moderate, 4 high) reported at install — triage pending
5. Security advisor WARNs: public buckets (`sfx-library`, `studio-assets`) allow listing; `has_discord_webhook` executable by anon — review intent

## Last Session

Merged `claude/charming-galileo-fewe3n` (4 commits ahead: Pitch board refactor, Supabase skill install, portfolio_blocks migration fix, merge back). Only conflict was `app/projects/[id]/page.tsx` — replaced the `publishToPortfolio` + manual publish button with a "BUILD PITCH BOARD" link to `/projects/[id]/pitch`. Removed `createPortfolioProject` import, `publishing` state, and `publishToPortfolio` function. Published portfolio entries now show "EDIT BOARD" link instead of "PUBLISHED" badge. All verification passes.

Prior: Polished README with badges, testing section, agent dev section, updated repo map. Created full Sam-persona e2e smoke test suite. Fixed pre-existing ESLint errors across 7 files (unescaped entities) and restructured lounge/page.tsx to fix conditional hooks violation. Consolidated 14 tables with overlapping permissive RLS policies — dropped redundant SELECT policies (project_tasks, project_beats, timeline_items, budget_items, beats, concept_assets, scenes, campaigns, character_castings, script_metadata), converted overlapping ALL policies to specific INSERT/UPDATE/DELETE on portfolio_projects/portfolio_media/portfolio_blocks, scoped scripts SELECT to authenticated role. PR #7 already closed. Implemented leaked-password protection: HIBP k-anonymity check in `lib/password-strength.ts`, toggle in Settings → Data & Privacy (persisted to `profiles.notification_prefs.leak_check`), wired into auth signup and settings password change flows.
- `AGENTS.md` at repo root — universal entry point (read by all AI tools natively)
- `CLAUDE.md` — Claude Code adapter (refs AGENTS.md + MCP config)
- `.github/copilot-instructions.md` — VS Code Copilot adapter
- `.cavern-intelligence/design-tokens.md` — full visual rubric from globals.css
- `.cavern-intelligence/playbook.md` — detailed 7-step change workflow
- `.cavern-intelligence/STATE.md` — iteration tracking file
- `.eslintrc.json` — initialized ESLint with Next.js core-web-vitals
- `sync-protocol.md` — expanded to cover all agent types (Codex, Cursor, Cline, etc.)

## Verification Results

```bash
npx tsc --noEmit    # TypeScript: clean
npm run build       # Next.js build: clean (warnings only)
npm run lint        # ESLint: configured (pre-existing warnings only)
npm run sync-intel  # Manifest: 216 files
```

## Pre-existing Lint Warnings (non-blocking)

- `react/no-unescaped-entities` — all fixed
- `react-hooks/rules-of-hooks` in lounge/page.tsx — fixed (hooks hoisted above guard)
- `@next/next/no-img-element` — 20+ occurrences, use <Image /> when refactoring
- `react-hooks/exhaustive-deps` — 15+ occurrences across files, add deps when refactoring
- `jsx-a11y/alt-text` — 3 occurrences, add alt text when refactoring
