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
- **GitGuardian**: mark the two open incidents false positives (test fixtures); delete the two throwaway e2e accounts in production (Authentication › Users).
- **Email sender** — a custom SMTP provider (Resend, Postmark…) in Supabase ›
  Auth › SMTP, on a domain you own, before strangers sign up (3.15).
- **Password reset needs the redirect allowed** (3.4 shipped) — Supabase dashboard › Auth › URL Configuration: add `https://<production domain>/auth/reset` (and each Vercel preview you test on) to the Redirect URLs, or reset links land on the Site URL instead. Then send yourself one reset email on production to check it, and the custom SMTP sender (below) before strangers use it.
- **Lawyer review** of `/privacy` and `/terms` (`lib/legal/legal.ts` names the operator).
- **Optional — branch protection on `main`** with `checks` and `database`
  required. (`e2e-local` is now a nightly scheduled check, not a PR gate.)
  Branch protection turns on GitHub auto-merge, so a green PR merges itself
  instead of waiting for a session to notice.
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

- **`tests/integration/validation-vs-rls.test.ts`** (2026-10-17) was written but never run (no `node_modules`, no Docker in that worktree). Run it against the local stack with typecheck and lint; fix anything it shows. S.

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

### 3.30 Definer allowlist: reconcile with the advisor — S (found 2026-10-25)
The security advisor lists 11 `SECURITY DEFINER` functions callable by anon and 39 by signed-in users; `database-and-security.md` §2.D was written against 9 + 24. List the advisor's functions, find each one not in §2.D, read its first lines for the gate, and add it (or fix it if ungated). Done when every advisor entry is in §2.D with its gate.

### 3.31 Index hygiene — S (found 2026-10-25, performance advisor, all INFO)
11 foreign keys without a covering index — mostly composite `(…_id, project_id)` keys whose leading column already has a single-column index (`call_sheets` shoot day, `character_castings`/`scene_characters`/`scene_states` character and scene, `scenes` location and shoot day, plus `hidden_messages.hidden_by`, `reading_corrections.created_by`, `reports.resolved_by`) — and 89 indexes never used, several duplicates (e.g. `scene_states_character_idx`, `*_fkey_idx` beside an older index on the same column). At 23 MB nothing is slow. In one migration: replace each single-column index with the composite one the advisor wants, add the three single ones, and drop exact duplicates (never a unique or PK index). Done when the advisor shows 0 unindexed FKs and no duplicate indexes, and the schema drift check is green.

### 3.32 Conflict-free co-writing (ADR 0008) — M/L (accepted by the owner, 2026-10-14)
**What**: a Yjs `Y.Text` for the script, synced over the existing `script_${id}` Supabase Realtime channel as the transport (no new WebSocket server); `scripts.content` stays the persisted truth; presence and cursors stay as they are. This is rung E3 of 3.18(d). **Where**: `lib/scriptos/sync.ts` (the provider lives beside it), the write surface in `components/editor/WriteView.tsx`, a scoped Yjs undo manager (local author only), then delete the conflict heuristic and its UI. **Done when**: two simultaneous sessions editing the same paragraph keep both edits word-level (an integration test with two simulated authors plus an e2e two-browser spec), offline capture reconciles through the CRDT on reconnect, and the conflict prompt is gone from the editor. Read `adr/0008-conflict-free-co-writing.md` first; it is the design.

### 3.18 Film graph — what's left after steps 1–3 — L (owner: the editor gets cut over)
Done: days and places (1), characters and sides (2), story time and continuity (3). Left, in order: **(a)** the app reads `scene_characters` / `call_sheet_calls.character_id` instead of `cast_list` / `character_name` text (S–M) — **started 2026-10-13**: `lib/film/cast.ts`, Continuity and the Casting board read the links; **(2026-10-27)** the Studio's stripboard, readiness, call-sheet cast, On set, Scenes tab and breakdown now read the links (`StudioContext.castOf`); still on the text: the public `/call` page (`lib/studio/api.ts`) and `character_name` on calls (plan: [plans/2026-10-27-graph-cutover-audit.md](plans/2026-10-27-graph-cutover-audit.md)); **(b)** continuity extras — a photo and wardrobe/prop elements on a look, a wardrobe/make-up sheet (PDF), shoot order beside story order, the look-change warning on the call sheet (M); **(c)** step 4 entities and links, the card, mentions (L); **(d)** the editor on the graph — **a major expansion, not a thinning** (owner, 2026-10-11): planned rung by rung in [plans/2026-10-11-editor-integration.md](plans/2026-10-11-editor-integration.md) (E0 safety net → E1 take the page apart → E2 read the graph → E3 CRDT → E4 write the graph → E5 margin links → E6 contract; XL overall, decisions for the owner in §6); **(e)** step 5 money, step 6 my day, step 7 drop the text columns. Done when nothing reads `scenes.cast_list`, `scenes.location` or `character_name` and the old columns are gone.

### 3.32 Ad writing and copywriting — a format and an editor — L (owner, 2026-10-27: "probably the main one")
Advertising and copy is a first-class format. Needs (spec first, in this order): **(a)** the format template — phases brief → concept → copy → client review → production → delivery, with the client-approval gate on (depends on the phases-as-data design in [plans/2026-10-27-link-layer-and-card.md](plans/2026-10-27-link-layer-and-card.md) › slice D); **(b)** campaigns and deliverables — one idea, many pieces (30/15/6 s spots, posters, banners, headlines, radio, social), each with its constraints and its own versions; **(c)** client review — a guest link to a numbered version with comments, approve / changes requested; **(d)** brief and brand rules as approved references every piece is checked against; **(e)** the editor: two-column picture/sound spots and plain structured copy with length and character limits (ScriptOS knows screenplay formats only). Done when a copywriter can take a client brief to an approved set of deliverables, with the client reviewing in a browser without an account.

### 3.18a Backfill: the "list, don't guess" report does not exist — S (found 2026-10-18)
`film-graph-spec.md` §6/§8 promise that ambiguous matches are *listed for a person to settle*. The two backfills (`20261010010000`, `20261011010000`) only match on `upper(btrim(name))`, so near-identical names (`COFFEE SHOP` / `COFFEE  SHOP`, `DR. SMITH` / `DR SMITH`) stay separate rows — nothing is merged wrongly, but nothing is listed either. `tests/integration/film-graph-backfill.test.ts` pins the no-merge behaviour and carries two `it.todo`s for the listing. Done when a read-only report (new migration + persona test) names the near-duplicate pairs per project and the todos become tests.

### 3.20 The classifier and the importer — what is still wrong — S (found 2026-10-11; B2, B3, B5, B6 fixed the rest)
Still pinned as an expected-failure test: `lib/scriptos/parser-gaps.test.ts` (1).
1. **Done (B9):** `Character.firstLineIndex` is the line of the first cue (-1 if none), `Scene.omitted` is gone (nothing read it), `ScriptLine.confidence` is the decoder's own and feeds the editor's "doubtful reads". `Character.lines` counts speeches, as its comment now says.
2. **Real PDFs** (needs the owner): the PDF reader is tested on synthetic pages only. Send a few script PDFs (text PDFs and a scan) so it can be measured on real item splitting, rotation and two-column dual dialogue; a scan is reported as "no text" and not OCR'd.
**Fixed:** Fountain import as written, the title page, dual dialogue as Fountain spells it (B2); numbered headings with a full stop, `FADE OUT.` and bare transitions, names with digits and full stops, non-Latin cues, "Interior lights…", a mid-sentence "draft" (B3); shouted dialogue after a cue, `(beat)` mid-speech, ALL-CAPS action before action (B5, the whole-document decoder); the PDF reader (B6).

### 3.21 The deep brain — the script engine, rung by rung — XL (owner direction, 2026-10-12)
A layered, deterministic, explainable reading engine: lossless Fountain first, then evidence, a document profile, a whole-document decoder, the suite's context as priors, and memory of corrections; the importers rebuilt on the same engine. Plan, layers, baseline and decisions: [plans/2026-10-12-the-deep-brain.md](plans/2026-10-12-the-deep-brain.md). **B0 (the measure) and B1 (hard to fool: metamorphic stability, PDF layout variants, a git-ignored private corpus runner) are built** — `lib/scriptos/corpus/`, with floors that may only be raised. Next, in order: **B2** Fountain complete, and Fountain imported as-is · **B3** the evidence layer (fixes numbered headings, `FADE OUT.`, non-Latin and digit/period names; also BACKLOG 3.20) · **B4** document profile · **B5** the decoder · **B6** the PDF reader rebuilt on geometry · **B7** the project's context in · **B8** memory and corrections · **B9** confidence out to the suite. Done when the corpus matrix's weakest cell is above 0.9 and a private real-script corpus agrees. Owner input needed: real scripts for the private corpus.

### 3.22 The reader's context: places, the previous draft — M (B7 follow-ups; rejections shipped in B8)
(a) **Done (B8):** a stored per-project "not a character" / "is a character" list (`reading_corrections`), a "Not a character" action in the Character Bible with a way back, obeyed by the editor and the Studio. (b) **Places and the previous draft as evidence**, once every surface that writes the scene index reads with one shared context (today the editor and the Studio do; public share, export, pitch and brief pages parse without it). (c) Context for the other callers where it does not affect scenes. Done when a rejected name survives a reload and both surfaces agree on the scene index.

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
  (iOS has no install prompt), and ~~Web Push~~ (**live 2026-10-25**; iOS 16.4+,
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
**Moderation, first slice built:** anyone signed in can **Report** a Lounge message, a job or a profile (a flag, a reason, one report per person per thing); admins work `/admin/reports` (open / resolved / dismissed, a link to the thing, who reported). An admin can **close a reported job** from the queue (`admin_close_job`, audit-logged). An admin can also **read a reported message and hide it** (everyone reads "[Removed by an admin]"; the original is kept for admins; bring-back restores it). An admin can **suspend an account** from `/admin/users` (the auth service's ban: no sign-in, no refresh, sessions ended; nothing deleted; reversible; audit-logged; not yourself, not an admin). An access token already issued lasts until it expires (at most an hour). Left: notifying the reporter, reporting from more places (portfolio pieces, media), and admin read access to a reported message in a private channel (deliberately not granted). **Crafts, channel suggestions, project formats and brief questions have admin screens (`/admin/crafts`, `/admin/channel-presets`, `/admin/formats`, `/admin/brief-questions`: add, remove).** Left on the brief screen (plan: `plans/2026-10-17-admin-brief-questions.md`): edit and reorder a question, set `implies`/`detect`/`ask_when` (still migrations), an audit-log entry when a question is removed (it deletes every project's answer). And before the network opens to strangers:
report a message / job / profile, an admin queue, hide and suspend. Done when
the owner can add a craft without a deploy, and a report reaches the queue.
**Redact error stacks (S, found 2026-10-18):** `client_errors.stack` is stored and shown unredacted (`lib/errors/report.ts` `describeError`, `report_client_error`, `/admin/errors`). Strip origins, absolute paths, query strings and token- or email-like text before storing, in the client and in the RPC (new migration + persona test). Done when a stack with a path and a token is stored redacted. See `bible/09-admin.md` › Known gaps.

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
  `vitest.config.ts` (floors 56 / 55 / 57 / 56, measured 58 / 58 / 59 / 58 on 2026-10-12); the `checks` job runs it and uploads the report — CI enforces both rules the done-state asks for.
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


---

## 4. Wishlist (owner, 2026-10-07) — ranked and scoped in [wishlist-ranking.md](wishlist-ranking.md)

**Order (2026-10-10, owner: most impressive and impactful first):** island live activities (4.1) → money (4.6) → comparing versions (4.12) → industry interchange (4.9/4.10) → characters (4.8) → mood boards (4.5) → editor navigation (4.7) → casting (4.15) → offline (4.13) → world building (4.11); blocked on an outside service or decision: AI voices (4.14), translation (4.3), Discord (4.2), learning (4.4). Slices, schema and "done when" for each are in the ranking file; a slice moves into §3 when it starts.

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
**Built**: Discord sign-in (`app/(suite)/auth`, `signInWithOAuth({ provider:
'discord' })`; name and avatar from the identity in `app/(suite)/auth/callback`);
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
A/B pages, locked pages with asterisks, manual scene numbers (the parser
reads `12A` but `sync_script_scenes` stores the position in the integer
`scenes.scene_number` — needs a text column); act breaks for
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
take theirs), sync state in its header, and (2026-10-18) a status-bar chip
for the script queue — pending scripts and deletes, network, a retry
countdown with backoff (15 s → 5 min), "Sync now" (`SyncStatusChip`); On set
works offline; Capture's outbox; a service worker; an installable web app
(iPhone polish is 3.13).
**To add**: an app-wide offline indicator (4.1; the chip's `getSyncStatus`
store is the feed for it), sync status per document in lists, downloading a whole project for offline, an offline queue
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

### 3.24 Voice rooms beyond eight — an SFU — L (found 2026-10-18)
A voice room is a full mesh and now refuses a 9th person (`lib/webrtc/mesh.ts`: toast + "room is full"). Left: **(a)** an SFU (LiveKit/mediasoup — an outside service and cost, owner's call) so rooms scale past 8; **(b)** order seats by a server timestamp instead of each client's clock (S); **(c)** check the cap before asking for the microphone (S); **(d)** a two-browser e2e for voice (M). Done when a 12-person room works, or the cap is raised on purpose, and a two-browser spec covers the 9th joiner.

### 3.23 Owner's workflow: View as everywhere, announcements, an owner dashboard — M (owner request, 2026-10-12)
**View as** exists for the hub, the Studio, the Lounge and the call-sheet page (`lib/os/viewAs.ts`). Left: any other surface that decides ownership itself should read the same store; a "view as this person" for a named crew member (their role and craft) is the next step beyond Crew. **Announcements:** project announcements are built (the hub's "Tell the team" box → the project's announcements channel + each confirmed crew member's bell); left: a platform-wide broadcast (needs email first, 3.15). (`notify()` now returns an error message; the announcement box uses it, the other callers still ignore it — fix them as each is touched.) **Owner dashboard:** the first slice is on Today's "Your projects" — for each project you run: unanswered invites, overdue tasks, the next shoot day and whether its call sheet is issued. Left: who has not acknowledged a call sheet (needs an acknowledgement record), budget overruns, the `/admin` stats beside them for admins. Done when each is in the suite and covered by a persona spec.

### 3.28 The Lounge overhaul and the platform hub — L (owner, 2026-10-25)
A full redesign of the Lounge plus a platform-wide hub: *What's new*, *Learn*, *Status* (incidents), *Case studies*, *Help* (support cases). Plan, data, personas and slices L0–L6: [plans/2026-10-25-lounge-overhaul.md](plans/2026-10-25-lounge-overhaul.md); five decisions for the owner in its last section. L0 done (2026-10-25: the page split into `useLounge` + seven components). L1 done (2026-10-25: `/hub` with What's new and Learn by audience, `/admin/hub`, push for important posts, the hub is where sign-in lands). L2 done behind flag `hub_status` (2026-10-26: incidents with severity, updates and resolve; a suite-wide banner; production admins-only until the owner graduates the flag). L3 done behind flag `hub_help` (2026-10-26: support cases at `/hub/help`, the admin queue at `/admin/support`, answers notify and push; left: a screenshot attachment, email once 3.15 exists). L4 done behind flag `hub_case_studies` (2026-10-26: owner opt-in in Studio › Share, admin links consenting productions, withdrawing pulls the case study back to draft; left: show the production's media). Next: L5 (the redesign) and L6. Feature flags (`lib/flags.ts`, ADR 0007) are in: unfinished slices ship behind a flag. Done when every slice's done-when holds.

### 3.28a Hub: announce a scheduled important post when it goes live — S (found 2026-10-25)
`internal.hub_posts_announce()` skips an important post whose `published_at` is in the future (it would push a post nobody can open yet), so a scheduled important post is never announced. Add a pg_cron job (every 5 min) that announces important posts whose `published_at` has passed and that have no `/hub/<id>` notifications yet. Done when a scheduled important post notifies everyone within 5 minutes of going live (persona test).

### 3.25 Story interview — a guided path from idea to skeleton — M/L (owner idea, 2026-10-20)
A step-by-step interview that builds the story's skeleton **before** dialogue is written, and teaches a newcomer the workflow as they go. Today `lib/guides` (workflows, steps) teaches *how to use the suite* and `lib/brief` asks the project questions; neither turns answers into structure. Build: a stored, resumable interview (premise, protagonist's want and need, the central conflict, theme, ending, the key turning points) whose answers produce an ordered beat list and a scene skeleton in the editor and the film graph — real rows, editable afterwards, never a mock. Each step explains *why* it is asked. Data: answers per project (RLS through `can_shape_project`), persona-tested (Sam writes, Jordan co-edits, Riley sees nothing). Done when a first-time user can answer the interview and land in the editor with a scene skeleton that persists, and a reload resumes mid-interview.

### 3.26 Story-structure templates — S/M (owner idea, 2026-10-20)
Selectable structures to lay a skeleton over: three-act, five-act (Freytag), the hero's journey, the story circle, a seven-point outline, a beat sheet, and a free "none". Each template is data (named beats with a suggested position and a one-line purpose), applied from 3.25 or from the outline, and a script can be **checked against** one (which beats have a scene, which do not — a report, never an automatic change). Also worth scoping: branching / non-linear structure for games and interactive stories as its own template type. Done when a template can be chosen, applied, and reported on, and the beats it creates survive a reload.

### 3.27 Open core: the license and the free / paid boundary — M (owner decision; lawyer review)
The repository is already public (license: proprietary `LICENSE`, all rights reserved). The owner is weighing an open-source core with a paid tier (extended features, storage, project space, AI features). Needs, in order: **(a)** the license decision, with the lawyer (a permissive license, AGPL, or a source-available license such as BSL each answer "may a competitor host a fork" differently); **(b)** a single entitlements layer — one place that answers "may this account do X / how much storage", with plan limits in the database and RLS-safe — today the suite has no plan or limit concept; **(c)** the pre-publication pass: personal data in docs and session notes, third-party assets and fonts that cannot be redistributed, a final secret scan (`secret-scan.yml` already covers history). Done when the license is chosen and committed, a free account hits a real plan limit through the entitlements layer (persona-tested), and the publication checklist is clean.
