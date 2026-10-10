# The wishlist, scoped and ranked

Written 2026-10-10 from BACKLOG §4 (the owner's list of 2026-10-07), checked
against the code that day. Owner direction: **the most impressive, impactful
parts of the suite first, however tedious.** This ranks all fifteen areas and
scopes each into slices that ship one PR at a time. Nothing here is built yet;
when a slice is started it moves to BACKLOG §3 with its "done when".

## How it's ranked

Each area is scored on four things, then ordered by the first two:

- **Impressive** — would it make a filmmaker, investor or festival programmer
  stop and say "that's different"? (the demo test)
- **Impact** — how many people use it, and how often, once it exists.
- **Reach** — how much of it we can build well *without* an outside service,
  a content team or a product decision from the owner.
- **Cost** — S ≈ hours, M ≈ a session, L ≈ several sessions.

The house rules still apply: nothing ships as a mock; anything needing a paid
outside service (voices, translation, a Discord bot, AI) waits until that
service is chosen.

## The ranking

| # | Area | Impressive | Impact | Reach | Cost | Tier |
|---|---|---|---|---|---|---|
| 1 | The island's live activities (4.1) | ●●●●● | ●●●●○ | all in-house | L | **Signature** |
| 2 | Money: templates, per-scene cost, rates × days, reports (4.6) | ●●●●○ | ●●●●● | in-house | L | **Signature** |
| 3 | Comparing versions (4.12) | ●●●●○ | ●●●●○ | in-house | M | **Signature** |
| 4 | Industry interchange: formats and reports (4.9, 4.10) | ●●●●○ | ●●●●● | in-house | M/L | **Signature** |
| 5 | Characters: arcs, relationships, consistency (4.8) | ●●●●● | ●●●○○ | in-house | M | Depth |
| 6 | Mood boards as objects (4.5) | ●●●●● | ●●●○○ | in-house | M/L | Depth |
| 7 | Editor navigation and power editing (4.7) | ●●●○○ | ●●●●● | in-house | S/M | Depth (quick wins) |
| 8 | Casting (4.15) | ●●●○○ | ●●●○○ | in-house | M | Depth |
| 9 | Offline and installable, the rest (4.13) | ●●●○○ | ●●●●○ | in-house (+3.13 push setup) | M | Depth |
| 10 | World building and locations (4.11) | ●●●○○ | ●●○○○ | in-house | M/L | Worlds |
| 11 | Table read with AI voices (4.14) | ●●●●● | ●●●○○ | **needs a voice service** | L | Blocked |
| 12 | Translation and localisation (4.3) | ●●●●○ | ●●○○○ | **needs a translation service** | L | Blocked |
| 13 | Discord, the rest (4.2) | ●●○○○ | ●●○○○ | **needs a bot host + a product call** | M/L | Blocked |
| 14 | Learning (4.4) | ●●●○○ | ●●●○○ | **needs content, and an owner** | L | Blocked |

Beside the list, two things gate opening the network to strangers and rank
above any of it for launch (they're not wishlist items): **moderation** (3.14:
report, queue, hide, suspend) and the **email sender** (3.15, with the SMTP
account in BACKLOG §1). **Web Push setup** (VAPID keys in Vercel, the dispatch
secret) is owner-side and finishes 3.13.

Why this order. The first four are what a producer or writer feels in the
first hour and what sets The Cavern apart: the island makes the suite feel
alive and is the most demoable thing on the list; money and interchange are
what let a real production use it instead of Movie Magic and Final Draft;
version comparison is what a writer needs the day they get notes. The depth
tier makes the tools richer. The blocked tier is impressive but waits on
decisions or money that aren't ours to spend.

---

## 1. The island's live activities (4.1) — L, four slices

**What exists:** `lib/island/mode.ts` (rest / context / live / open / caps /
dot), `emit()` for brief events, the bell, ⌘K, reduced-motion respected.
**Missing:** a layer that *holds* the island while something runs.

**Design.** One registry of activities (`lib/island/activities.ts`), each with
`{ id, kind, priority, title, detail, controls[], progress? }`. The island
shows the highest-priority one in a new `activity` mode, with a count when
others are running; tapping cycles; each activity brings its own controls. A
pure function ranks them (unit-tested), the way `islandMode()` already is.
Activities register and clear from the code that owns them — the island never
reaches into features.

**Slices (each one PR, in this order):**
1. **The engine + network/sync + timers.** Registry, ranking, the `activity`
   mode, a hold time and an action on temporary notifications, the offline /
   "saved on device, will sync" / outbox-count state, the writing sprint
   (`WritingLoop`) and On set's day clock. *Done when:* going offline in the
   editor holds "Offline — 2 changes waiting" on the island and clears when
   synced; a running sprint shows its time and pauses from the island.
2. **Call + recording.** The Lounge voice room (`lib/webrtc/voice.ts`: who's in,
   mute, leave) and Capture's `MediaRecorder` (time, stop, discard). *Done
   when:* a call started in the Lounge stays on the island on every page, with
   working mute and leave.
3. **Music.** Now-playing from `GlobalAudioWidget` / Spotify: title, play,
   pause, next. *Done when:* the track survives navigating the suite and shows
   on the island with controls.
4. **Uploads with progress.** Library, Capture outbox, SFX: upload progress
   events (Supabase Storage via XHR, or TUS for large files), per-file and
   overall. *Done when:* a 200 MB upload shows true progress and can be
   cancelled from the island.

No schema, no RLS; client-only. Tests: unit for ranking and registry,
component test for the mode, e2e for slice 1 (offline) and 2.

## 2. Money (4.6) — L, five slices

**What exists:** budget lines and actuals, vendors, expenses committed/paid
with receipts, timesheets, `lib/studio/money.ts`, the breakdown's costs and
"Push to budget", and the stripboard's **day out of days**
(`dayOutOfDays()`), which already knows who works which days.

**Slices:**
1. **Per-scene cost.** Roll the breakdown's element costs up per scene
   (`lib/studio/scene-cost.ts`, pure) and show it on scene cards, the
   stripboard strips and a "cost by scene / by day" view. *Done when:* a
   scene's cost equals the sum of its tagged elements, and a day's cost the
   sum of its scenes, tested.
2. **Rates × days.** Cast and crew day rates (a `rate_card` per craft on the
   project; no new table needed beyond `project_crew.day_rate` and a
   `crafts`-level default) × the days they work from the day out of days →
   labour lines in the budget, replacing guessed lines. *Done when:* changing
   the schedule changes labour cost.
3. **Templates + above/below the line.** Budget templates (micro, low, indie,
   studio) as data (`budget_templates`, admin-extendable like crafts and
   formats); `above_the_line` per category (crafts already carry it). *Done
   when:* starting a project from "indie" gives a sensible, editable budget
   grouped above and below the line.
4. **Cash flow, alerts, reports.** Cash-flow projection from the schedule and
   payment dates; "over budget" alerts (into notifications); printable budget
   and cost report PDFs; CSV and `.xlsx` export. *Done when:* a budget exports
   to a spreadsheet that opens with totals that match the screen.
5. **Currencies and tax.** `projects.currency` and per-line currency with a
   stored rate; tax jurisdiction profiles (GST/HST and provincial credits for
   Alberta first, since the brand is from there). Needs a product call on
   which jurisdictions. Movie Magic Budgeting export is last and
   best-effort.

Schema: `budget_templates`, `project_crew.day_rate`, `projects.currency`,
`budget_items.currency/fx_rate`. RLS follows the project (`can_access_project`
and the money policies already in place); persona tests for each.

## 3. Comparing versions (4.12) — M, three slices

**What exists:** locked revisions with colours and changed pages, a diff view
(`lib/scriptos/revisions.ts`, `DiffModal`).

**Slices:**
1. **Side-by-side and inline.** Any two revisions (or the current draft, or an
   imported script) laid out side by side with inline word-level colouring; next
   / previous change; filters (dialogue / action / scenes). A pure line-diff
   in `lib/scriptos/compare.ts` aligned by scene so a moved scene reads as moved,
   not deleted-and-added. *Done when:* two drafts with a renamed character and a
   reordered scene show those as such.
2. **Review mode.** Accept / reject per change into a working draft, with
   change statistics. *Done when:* rejecting a change restores the old text
   and the draft saves as a new revision.
3. **Change report.** PDF/print of the changes, grouped by scene, with
   page-number changes. Three-way merge and branches stay in the bible's
   known-gaps list (needs the CRDT decision).

No schema. Unit tests on the diff are the bulk of the work (alignment is the
tricky part).

## 4. Industry interchange (4.9 + 4.10 exports) — M/L, four slices

What lets a real production move work in and out.

1. **FDX round-trip fidelity.** A test corpus (a dozen real-shaped FDX files),
   import → export → import equality on structure; fix what drifts. *Done
   when:* the corpus round-trips without losing elements, dual dialogue, scene
   numbers or revisions.
2. **Script format features.** Intercut / montage / series of shots / flashback
   and dream formatting, A/B pages and locked pages with asterisks, manual scene
   numbers, headers and footers with dynamic content, act breaks for TV. Parser
   and PDF export.
3. **Breakdown reports.** The one-liner, location and props reports, proper PDF
   breakdown sheets (what's printable now becomes a real report set), and
   *suggested* elements from action lines (props, vehicles, wardrobe, VFX/SFX,
   stunts, animals) that the person accepts — never tagged automatically.
4. **Other importers/exporters.** Highland, Celtx (open formats first); RTF,
   ePub and HTML export; Movie Magic Scheduling / Gorilla export last (file
   formats are partly closed; best-effort and honest about it).

Schema: none (suggestions are computed). Heavy on tests.

## 5. Characters (4.8) — M, three slices

**What exists:** the character bible, a look-board per character, casting,
dialogue and scene counts.

1. **Consistency warnings.** Pure checks over the parse: a name spelled two
   ways (edit distance), a character speaking after a death beat or before
   introduction, a character with one line. Surfaced in the editor's lint
   and the character card. *Done when:* each rule has a test and a fixture.
2. **Richer cards + arc timeline.** Goals, fears, flaws, templates
   (protagonist / antagonist / mentor); an arc timeline across scenes from
   the beat board; appearances per scene; compare two characters. Schema:
   `script_characters` gains structured fields (or one `profile` jsonb) and
   `character_arcs` points (scene, state).
3. **Relationship map + bible PDF.** Who talks to whom (from the parse),
   plus named relationships; a printable character bible. Wardrobe from the
   breakdown's wardrobe elements.

Voice samples from a character's lines belongs with 4.14 (a voice service).

## 6. Mood boards as objects (4.5) — M/L, three slices

**What exists:** the Library (uploads, links, Pinterest via `/api/links`,
Openverse), boards as a tag on media, a look-board per character.

1. **Boards become objects.** A `boards` table (project, name, kind:
   character / location / tone / colour, position), media placed on a board
   with x/y/size (`board_items`); unlimited boards; templates; drag-and-drop
   arranging. RLS follows the project; board-level permissions can ride the
   private-overlay pattern already used for channels. *Done when:* a board
   can be arranged freely and survives reload and realtime with a teammate.
2. **Colour palettes + annotation + search.** Palette extraction in the
   browser (no service), annotate an image, search within a board, a slideshow.
3. **Export.** PDF and the pitch deck's present mode from any board.
   Google Images import is out (licensing; Openverse stays); AI suggestions
   are blocked on a service.

Also feeds 4.11 (location boards).

## 7. Editor navigation and power editing (4.7) — S/M, two slices

Cheap, daily, and it makes the editor feel professional. **Quick wins that can
land any time:**
1. Go to scene number / page number / a character's scenes (⌘G, with the
   command palette); next/previous scene; command history and repeat.
2. Quick actions on a selection; stash snippets expanding from a typed trigger;
   block selection. Multi-cursor is the one genuinely hard item (the editor is a
   textarea + highlight layer) and waits on the editor split, which waits on
   better tests.

## 8. Casting (4.15) — M, two slices

1. Drag crew onto roles; side-by-side candidates (photos, reels, notes per
   candidate per role); decision history. Schema: `casting_candidates`.
2. Audition scheduling (into the call-sheet machinery) and a casting-sheet
   PDF.

## 9. Offline and installable, the rest (4.13) — M

The app-wide offline indicator ships with slice 1 of the island. Then: sync
status per document in lists, "sync now", **download a whole project for
offline**, an offline queue for actions beyond scripts, bandwidth-aware sync,
and a line-by-line conflict view. Plus 3.13's Web Push setup (owner) and Sign
in with Apple if an App Store build happens.

## 10. World building and locations (4.11) — M/L

Locations exist. Add: a map view (needs a map provider — OpenStreetMap tiles
are free; decide), time period, world rules and lore, technology level, magic
system, where each location appears (from scenes), weather and season, a
continuity checker, a world timeline, a world bible PDF, a shareable world
database. Mostly structured notes with relations — modest code, a lot of UI.

## Blocked on an outside decision

- **11. Table read with AI voices (4.14).** The most impressive demo on the
  list, and the one that needs a paid text-to-speech service (and consent/rights
  work for actor-reference voices). Everything around it (the player, pacing,
  bookmarks, notes during playback, comparing reads) can be built against the
  browser voices we have today, so the day a service is chosen, it slots in.
- **12. Translation (4.3).** A translation service, plus the side-by-side
  editor, a glossary and translation memory (those are ours), and an i18n pass
  on the suite. Start with the interface i18n scaffold only when a market is
  chosen.
- **13. Discord (4.2).** The `guilds` scope and server stats are small; roles →
  suite roles needs a decision on the source of truth; an announcements bot is
  hosted infrastructure.
- **14. Learning (4.4).** Mostly content, not code. The code part (progress,
  badges beyond writing, challenges, a daily prompt, mentor matching from
  crafts) is M and can go first, but without lessons to point at it's an empty
  room. Needs an owner for the content.

## Suggested path

Tier 1 slices interleave so no single area monopolises a month:
`island 1` → `money 1` → `compare 1` → `interchange 1` → `island 2` →
`money 2–3` → `compare 2–3` → `interchange 2–3` → `island 3–4` → `money 4` →
then Depth, quick wins (7) slotted between big slices. Launch gates (moderation,
email) get done before the network opens, whichever slice is in flight.

The owner's say is needed on: jurisdictions for money's tax profiles (2.5),
whether branches/merge are wanted (3), the map provider (10), and which
outside services to choose first (11–13).
