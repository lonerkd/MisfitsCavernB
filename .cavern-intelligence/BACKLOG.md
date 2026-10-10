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
- **Apply three migrations to production** (the cloud connector can't write; paste each into the SQL editor, in order): `20261007010000_jobs_one_select_policy.sql`, `20261007020000_append_to_script.sql`, `20261008010000_web_push.sql`. Then Web Push setup (3.13): VAPID keys in Vercel, dispatch URL + secret in `internal.push_config`. STATE "Resume here" has the checks.
- **GitGuardian**: mark incidents 37942181 and 37942439 false positives (test fixtures); delete the two `e2e.recover.*@example.com` accounts in production (Authentication › Users).
- **Email sender** — a custom SMTP provider (Resend, Postmark…) in Supabase ›
  Auth › SMTP, on a domain you own, before strangers sign up (3.15).
- **Password reset needs the redirect allowed** (3.4 shipped) — Supabase dashboard › Auth › URL Configuration: add `https://<production domain>/auth/reset` (and each Vercel preview you test on) to the Redirect URLs, or reset links land on the Site URL instead. Then send yourself one reset email on production to check it, and the custom SMTP sender (below) before strangers use it.
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
- **Stale remote branches**: 17 of the 18 deleted 2026-10-06 (tips matched; restore with `git push origin <sha>:refs/heads/<name>` from the list in git history of this file). `claude/design-scales` stays — it now carries PR #137 (data access through `lib/`, the sign-in fix).

## 2. To verify

- **`e2e/onset-offline.spec.ts` on Windows with the older local Chromium
  (1228)**: after an offline reload the day stays on "Loading the schedule…".
  Same on plain `main`, passes in CI and in the cloud container. Check on a
  second Windows machine / a newer Chromium before treating it as a bug.

## 3. Upgrades (scoped — in suggested order)

### 3.1 Dev-toolchain advisories — watch, S when upstream moves
Production dependencies: **0** vulnerabilities (`npm audit --omit=dev`,
2026-10-06, after `source-map-js` 1.2.2; 2026-10-03's fix bumped `dompurify`,
`fflate`, `brace-expansion`, `postcss-selector-parser` and the Next ESLint
config). Left: 7 high, all `braces` (every version flagged) reached only
through dev tools — `tailwindcss` → `chokidar`, and `eslint-config-next` →
`fast-glob` — and 2 moderate, `postcss-selector-parser` under Tailwind 3's
`postcss-nested`. Nothing ships to the browser or server; the only offered
fix is `--force` (Tailwind 4, breaking). On Windows, check a lockfile bump
changed only the package's own lines: npm there strips the `libc` fields. Re-run `npm audit` when Tailwind or `eslint-config-next`
release; take the plain fix then. Done when `npm audit` reports 0.

### 3.5 Activity feed completeness — M (needs a product call)
`logActivity` (`lib/supabase/activity.ts`) is called for jobs, portfolio,
projects, scenes and wraps; not for media uploads, crew invites/role
changes, script revisions, call sheets issued or documents. Decide what the
feed should show (and to whom), then add the calls. Done when each chosen
event appears in the feed for the right audience (persona-tested).

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

**In place (2026-10-08, `claude/repo-practice`):**
- `LICENSE` (proprietary — lawyer confirms the exact wording), `SECURITY.md`
  (private reporting through the Security tab or the privacy contact),
  `CODEOWNERS` (already existed).
- `CHANGELOG.md` — Keep a Changelog, a baseline entry for everything up to
  2026-10-08, and the release process (bump `package.json`, move
  Unreleased → version, tag `vX.Y.Z`); `release.yml` refuses a tag that
  isn't the version in `package.json`.
- `adr/` — four records (RLS as the security boundary, data access through
  `lib/`, PWA before the App Store, push dispatched from the database) with
  an index and template.
- Conventional commits: `pr-title.yml` fails any PR whose title isn't one —
  the title is the commit a squash-merge leaves on main (the PR template
  says so too).
- Coverage: `npm run test:coverage`, scoped to `lib/`, with thresholds in
  `vitest.config.ts` (floors 47 / 47 / 49 / 47 — the 2026-10-08 baseline of
  49 / 49 / 51 / 49, re-measured 2026-10-10 after #137's new `lib/` code; see
  3.17); the `checks` job runs it and uploads the report — CI enforces both rules the done-state asks for.
- Full-history secret scan: `secret-scan.yml` (gitleaks over every
  reachable commit; weekly + main + PRs). Three historical findings, all
  reviewed: two are the R2/S3-compatible docs phrase,
  one an expired localhost session JWT (committed 2026-07-05, removed) —
  accepted in `.gitleaksignore`, reasons in the PR.
- SBOM: `sbom.yml` — SPDX (full and production-only) plus a licence
  summary, uploaded as artifacts on main pushes and weekly.

**Owner:** branch protection on `main` with `pr-title`, `checks` and
`database` required; signed commits; the first `v*` tag; the lawyer's OK on
the `LICENSE` wording.


### 3.17 Unit tests for the `lib/supabase/*` modules #137 added — M
#137 moved every page's data access into `lib/supabase/*` (`project-hub`,
`scripts`, `campaigns`, `audio`, `media`, `today`, `client-errors`, …). They
are covered end to end (persona and e2e tests) but not by unit tests, which
is what `npm run test:coverage` counts: `lib/` fell from 49.9 / 49.7 / 52.3 /
49.4 % (statements / branches / functions / lines) to 48.0 / 47.0 / 49.8 /
47.7, and the floors in `vitest.config.ts` were re-measured to 47 / 47 / 49 /
47. Write the unit tests (mock only the Supabase client at its edge; the
planning and mapping logic is the part worth testing), then raise the floors
back to 49 / 49 / 51 / 49 or higher. Done when the floors are back at or
above the 2026-10-08 baseline.

---

## 4. Wishlist (owner, 2026-10-07) — ideas, not yet scoped

The owner's feature list, grouped by area and checked against the code that
day. **Built** = already in the suite (where, so nobody rebuilds it).
Everything else is an idea: before one is started it gets a scoped 3.x entry
(size, data, RLS, "done when"). The house rules still apply — nothing ships
as a mock: anything that needs an outside service (voices, translation, a
Discord bot, Pinterest/Google import, AI suggestions) waits until that
service is chosen and paid for.

### 4.1 The island: live activities
The island already has modes (`lib/island/mode.ts`: rest, context, live,
open, caps, dot) and `emit()`s brief events (saved, synced, joined).
**Built**: the resting pill, notifications (bell + `live` events), search
(`/` in the caps deck, ⌘K), animated state changes (framer-motion, reduced
motion respected), the editor's sync events.
**To add** — a *live activity* layer that holds the island while something
runs, one at a time by priority, each with its controls:
- call active (Lounge voice room: who's in, mute, leave) — `lib/webrtc/voice.ts`
- recording (Capture's voice memo / clip — `MediaRecorder` in `Capture.tsx`)
- uploading, with a progress bar (Library, Capture outbox, SFX) — needs
  upload progress events (Storage over XHR/TUS)
- music playing (now-playing mini player — `GlobalAudioWidget` / Spotify)
- timer running (writing sprint — `WritingLoop`; On set's day clock)
- network / sync status (offline, "saved on device, will sync", outbox count)
- a temporary notification (exists as `live`; add a hold time and an action)

### 4.2 Discord
**Built**: Discord sign-in (`app/auth`, `signInWithOAuth({ provider:
'discord' })`; name and avatar from the identity in `app/auth/callback`);
posting a channel's messages to a Discord webhook (`/api/discord/notify`,
`/test`).
**To add**: the person's Discord servers and real server stats (the `guilds`
OAuth scope and the Discord API); presence/status on profiles; Discord roles
→ suite roles (product call: which side is the source of truth); rich embeds
when a script, pitch or call sheet is shared to Discord; an announcements bot
(a hosted bot — infrastructure decision).

### 4.3 Translation and localisation
Nothing built. Translate a script into 50+ languages (a translation
service), side by side with the original, formatting kept (translate
dialogue and action, never element types); translation memory and a
per-project glossary; translator comments, review/approval and credits;
version sync (flag lines whose original changed); export bilingual scripts
and subtitles (SRT/VTT from dialogue — table-read timings help); notes on
cultural context. Also the suite's own interface in other languages (i18n) —
not on the list, but a translator audience needs it.

### 4.4 Learning
**Built**: in-app guides by workflow and experience (`lib/guides`,
`GuidePanel`, `GuideSetup`); the writing loop's streaks, sprints and badges
(`lib/writing`).
**To add**: a video tutorials library, interactive lessons, exercises with
feedback, analysis of famous scripts (rights), technique breakdowns, genre
courses, mentor matching (from crew profiles and crafts), group workshops
and live Q&A (on Lounge voice), certificates, progress tracking and skill
badges beyond writing, community challenges, a daily writing prompt, reading
lists, industry news, masterclasses. Mostly content, not code — needs an
owner decision on who makes it.

### 4.5 Mood boards
**Built**: the Studio Library (uploads incl. audio and video, YouTube/Vimeo
links, Pinterest boards via `/api/links`, Openverse search with credit,
boards); a look-board per character (`character_media`); scene references
(`scene_media`, the editor's Refs panel); tags; publishing per item
(`media.shared`); the pitch deck's full-screen presenting.
**To add**: boards as objects of their own (unlimited; templates: character,
location, tone, colour), drag-and-drop arranging, colour palette
extraction, annotating images, search within a board, board-level
permissions, PDF export, slideshow; Google Images import (licensing —
prefer Openverse); AI mood suggestions (service).

### 4.6 Budget and money
**Built**: budget lines and actuals (project page, Studio › Money), vendors,
expenses committed/paid with receipts from the library, timesheets,
breakdown costs and per-category rates → "Push to budget" (`Breakdown · …`
lines).
**To add**: budget templates (micro, low, indie, studio) and above/below the
line; per-scene cost (roll up the breakdown's costs per scene); cast and crew
day rates × days (Day out of days exists); location costs from Locations;
equipment rental; invoices; cash-flow projection; currencies (none today —
every amount is plain dollars) and tax jurisdictions; cost alerts; financial
reports; export to Excel/CSV and Movie Magic Budgeting.

### 4.7 Editor: navigation and power editing
**Built**: scene list and outline (jump to a scene), ⌘K, the stash
(snippets beside the script), autocomplete for characters and headings.
**To add**: go to scene number / page number / a character's scenes;
multi-cursor and block selection; quick actions on a selection (tag mode's
selection menu is a start); macros; snippet expansion (stash → a typed
trigger); context-aware commands; command history and repeat.

### 4.8 Characters
**Built**: the character bible (description, backstory, motivation, arc,
notes — `script_characters`, `script_metadata.character_bible`), a
look-board per character, casting with each character's scene footprint,
dialogue and scene counts (editor › Stats).
**To add**: richer cards (goals, fears, flaws), an arc timeline, a
relationship map, voice samples taken from their lines, a backstory
timeline, appearances per scene, comparing two characters, templates
(protagonist, antagonist, mentor), consistency warnings (a name spelled two
ways, a dead character speaking), a character bible PDF, wardrobe from the
breakdown's wardrobe elements.

### 4.9 Script formats, import and export
**Built**: import PDF, FDX, Fountain, text; export PDF (title page,
watermark), FDX, Fountain, text; dual dialogue; scene numbers; revision
colours (blue … cherry, `REVISION_COLORS`) with locked drafts; MORE/CONT'D
on export; formats by project type.
**To add**: FDX round-trip fidelity tests; Movie Magic Screenwriter, Celtx
and Highland import; RTF, ePub and HTML export; intercut, montage, series of
shots and flashback/dream formatting; subtitled lines in another language;
A/B pages, locked pages with asterisks, manual scene numbers; act breaks for
TV; custom element styles; headers/footers with dynamic content.

### 4.10 Breakdown and scheduling
**Built**: tagging (with suggestions from past projects), categories and
rates, per-scene sheets, page eighths, scene duration, Day/Night and
INT/EXT, stripboard with auto-schedule and company moves, Day out of days,
call sheets, readiness, printable sheets, push to budget.
**To add**: suggested props, vehicles, wardrobe, VFX/SFX, stunts and animals
from action lines (to accept — never tagged automatically); a one-liner;
location and props reports; proper PDF breakdown reports; export to Movie
Magic Scheduling and Gorilla.

### 4.11 World building and locations
**Built**: Locations (status, permit, address, contact, cost, notes; scenes
link by name); scene references.
**To add**: location mood boards (4.5), a map view, time period, world rules
and lore, technology level, magic system, currency/language/culture notes,
where each location appears, weather and season, day/night cycle, a
continuity checker, a world timeline, a world bible PDF, a shareable world
database.

### 4.12 Comparing versions
**Built**: locked revisions with coloured changed pages and a diff view
(`lib/scriptos/revisions.ts`).
**To add**: side by side for any two versions or an imported script; inline
diff colours; change statistics and filters (dialogue / action / scenes);
next/previous change; scene-reorder and character-rename detection;
page-number change tracking; accept/reject per change in a review mode; a
change-report PDF; three-way merge and branches (with the CRDT idea in the
bible's ScriptOS known gaps).

### 4.13 Offline and installable
**Built**: the editor saves to IndexedDB first and syncs (retry, on
reconnect, tombstones for offline deletes), a conflict prompt (keep mine /
take theirs), sync state in its header; On set works offline; Capture's
outbox; a service worker; an installable web app (iPhone polish is 3.13).
**To add**: an app-wide offline indicator (4.1), sync status per document in
lists, "sync now", downloading a whole project for offline, an offline queue
for actions beyond scripts, bandwidth-aware sync, a line-by-line conflict
view.

### 4.14 Table read with AI voices
**Built**: the browser's voices, one per character, the script highlighted
as it reads, scene timings saved.
**To add** (a voice service): 50+ voices, emotion from parentheticals,
ambience from scene headings, optional sound effects for action, MP3/WAV
export, pacing, an actor-reference voice (consent and rights first), more
languages, listening together live (Lounge voice exists), bookmarks and
loops, notes during playback, comparing reads, scoring from the Soundtrack.

### 4.15 Casting
**Built**: casting per character with its scene footprint
(`character_castings`, Studio › Cast & crew); casting calls posted as jobs
(accepting an applicant casts them); each character's look-board.
**To add**: drag crew onto roles, side-by-side candidates (photos, reels),
notes per candidate per role, audition scheduling, decision history, a
casting sheet PDF.
