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

