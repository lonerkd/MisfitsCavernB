# The Studio — how it works

The Studio (`/studio`) is the production workspace: one project at a time, its
library, the screenplay's scenes and their references, production planning,
and what gets shared. The editor (ScriptOS) and the share link read and write
the same data, live.

## 1. Architecture

| Layer | Where | What |
|---|---|---|
| Data access | `lib/studio/api.ts` | `createStudioApi(client)` — every read/write of media, scenes, links, the lookbook. Takes the Supabase client as a parameter, so `tests/integration` runs this exact code as real personas. |
| Live hooks | `lib/studio/index.ts`, `lib/studio/live.ts` | `useLiveRows` (subscribe → load → merge Realtime; reload on reconnect/focus; local writes survive stale reloads), `useProjectMedia`, `useSceneMedia`, `useScriptScenes`, `useSceneIndexSync`, `useSignedUrls` (cached, renewed before expiry). |
| Pure logic | `lib/studio/scene-sync.ts`, `media-kind.ts`, `shoot-days.ts` | Scene alignment, media classification/embeds/upload checks, auto-schedule. Unit tested. |
| Page state | `components/studio/StudioContext.tsx` | One typed provider per project: library, links, scripts, selected script, its scenes, sync state. |
| UI | `components/studio/**`, `studio.module.css` | Tabs: Overview · Library · Scenes · Production (Story / Breakdown / Readiness / Schedule / Cast & crew) · Post (Cut review / Pipeline & deliverables) · Promos · Pitch · Share. |
| Editor | `components/editor/useEditorScenes.ts`, `SceneReferencesPanel.tsx` | Scene index sync while writing; per-scene references, note and colour in the **Refs** tab. |
| Share | `app/shared/[token]`, `app/m/[id]` | Server-rendered lookbook with link previews; stable permalinks for published files. |

## 2. Scenes follow the screenplay

`public.scenes` holds one row per scene heading of a script. The editor syncs
as you write (debounced); the Studio syncs from the saved text when a script is
opened. `planSceneSync` keeps ids stable through rewrites:

1. LCS on normalised headings — unchanged scenes keep ids when others move.
2. In each gap, old/new scenes pair in order by heading similarity — an edited
   heading keeps its id.
3. Still-new headings revive a removed scene with the same heading.
4. The rest are new; unmatched old scenes are soft-removed (`removed_at`).

`sync_script_scenes(script, base_ids, plan)` applies a plan atomically under an
advisory lock and rejects a stale plan (40001) — the client re-plans. Script
fields are only written by the sync; people own `note`, `color`, `shoot_day`,
`status`. Scripts outside a project have no index (the editor keeps their
notes/colours on the device and moves them in when the script joins a project).

## 3. Library and references

- Uploads: private `project-media` bucket, `<project>/<media id>/<file>`,
  50 MB, images/video/audio/PDF. Upload first, then the row; a failed row
  removes the file. Delete removes the row, then the file.
- Links: YouTube/Vimeo play inline (privacy-friendly embeds); image/video/audio
  URLs render directly; anything else is a link card. Only http(s).
- Find references: Openverse search; results are added as links with creator
  and source kept in the notes for credit.
- Crew can add, edit titles/boards/notes, and delete what they added; only the
  owner deletes others' items or decides what is published.

## 4. Sharing

Visibility (owner only): Private · Team · Anyone with the link · Public.
Viewers of the link see title, logline, creator, and **published** items
grouped under their scenes — never notes. Public projects' published media also
appear in the Showcase. Switching back to Team/Private closes the link at once
(nothing is cached). Published uploads have stable `/m/<id>` permalinks, used by
pitch boards and portfolios.

## 5. Production

- **Breakdown** (`BreakdownView`, data in `lib/breakdown`): tagged in the
  script (ScriptOS tag mode), priced and sourced here — by category or as
  per-scene breakdown sheets; element card (status, cost, owner, notes);
  **Categories & rates** edits the project's categories (name, colour, order,
  unit cost — data, never code). **Push to budget** writes one
  `Breakdown · <category>` budget line per costed category
  (`breakdown.syncBudget`: updates in place, removes stale lines, leaves other
  lines alone); the project page's budget panel does the same. Printable
  breakdown sheets. No hardcoded rates remain.
- **Readiness** (`ReadinessView`, `lib/studio/readiness.ts`): can we shoot
  it? Every scene checked against cast (character_castings), breakdown
  (tagged, all elements ready), shots planned, a dated shoot day, and
  references (optional) — read from the data, never ticked. Grouped by shoot
  day; the next day to prepare; "what unblocks the most" across all scenes;
  every blocker links to where it's fixed. Live (castings are in Realtime).
- **Schedule** (`StripboardView`, `lib/studio/stripboard.ts`): shoot days as
  columns, scenes as strips in the industry colours (INT/EXT × DAY/NIGHT);
  drag between days or Alt+←/→; each day shows pages against the project's
  day length (`settings.dayLengthEighths`, owner-set), company moves (more
  than one location), cast called; status dot planned → shot → wrapped;
  auto-schedule (`packShootDays`) at the day length; Day out of days;
  print. Call sheets (saved per shoot day: date, calls, wrap, address,
  weather, notes, per-person call times — `call_sheets`, `call_sheet_calls`);
  the board shows each day's call-sheet date.
- **Shot list**: per scene in Scenes (`shots`); also created by "Shot" margin
  notes in ScriptOS (`add_script_annotation`).
- **Story**: beat board; character bible with a look-board per character
  (`character_media`).
- **Cast & crew**: crew, presence, recruiting, casting with each character's
  scene footprint.

## 5b. On set

- **Studio › Production › On set** (`production/OnSetView.tsx`, logic in
  `lib/studio/onset.ts`): the shoot day for the people on it. It opens on
  today's call sheet (else the next dated day, else the last) with the
  location, planned call/wrap and **your own call time** (`call_sheet_calls`).
- The day's clock is five one-tap stamps — crew call, rolling, lunch, back
  in, wrap (`set_log`, latest stamp wins; tap a stamp to correct it). From
  them: where the day is, time on set (lunch excluded), time to or past the
  planned wrap.
- The day's scenes (`scenes.shoot_day`) with their shots as big Got / Drop
  toggles (`shots.status`); the first shot got starts the scene, "Wrap
  scene" wraps it (`scenes.status`) — the same data the stripboard,
  readiness and milestones read. Scenes, pages and shots meters.
- Continuity per scene (all days): notes with shot, take and a photo taken
  on the phone (uploaded to the library board "Continuity"). Day notes and a
  day's log timeline. Everything is live for the whole crew.
- Tool `onset` (production phase, opens early once there are call sheets).

## 6. Post

- **Cut review** (`post_cuts`, `post_notes`): a cut is a link (YouTube, Vimeo,
  Google Drive, …) or a library video. Notes carry a timecode, department and
  optional scene; anyone on the team resolves them (recorded as themselves),
  only the author edits the text (`internal.post_notes_guard`).
  `components/studio/post/CutPlayer.tsx` reports/sets the playhead for library
  videos (`<video>`), YouTube and Vimeo (their postMessage player APIs) so
  "Now" and click-to-seek work; Drive and other links take typed timecodes.
  Scene cards in Scenes show their open post notes.
- **Cut notes on script lines**: beside the player, `post/CutScript.tsx` shows
  the scene on screen as a script page. It follows the cut when the player
  reports time: `cutMap` in `lib/studio/cutlines.ts` lays the scenes along the
  cut by length (table-read time, else eighths) and pins them where notes
  already say "this moment is scene N". The scene strip jumps to any scene.
  Clicking a line pins the next note to it (`post_notes.line_offset` from the
  heading + `line_text`); without a line, a note is tied to the scene shown.
  `findLine` re-finds the line after edits (same text nearby, or mostly the
  same words). In the editor the notes sit in the right margin on their line
  (`components/editor/CutNoteMarkers.tsx`, live via `useLineCutNotes`), can be
  resolved there, and link back to the moment:
  `/studio?tab=post&project=…&cut=…&t=…` (the Post tab opens even before its
  phase). "In script" on a note opens `/editor?…&note=…`, or goes to the other
  pane in a split screen, on its line with the note open.
- **Pipeline & deliverables** (`post_items`): stages and deliverables with
  status, due date and owner; "Set up the standard pipeline" seeds
  `STANDARD_POST`.

## 7. Tests

- `lib/studio/*.test.ts` — alignment, classification (incl. YouTube/Vimeo/Drive embeds), scheduling, shot numbering, timecodes.
- `tests/integration/{media-library,scene-index,share-lookbook,realtime,activity-feed,production-records,post-production,cut-note-lines,privacy}.test.ts`
  — personas through PostgREST/Storage/Realtime/RLS.
- `e2e/studio-journey.spec.ts` — real browser, local stack: upload → link to a
  scene → editor → publish → logged-out share link → revoke → live crew sync.
  Runs in the CI `database` job.
