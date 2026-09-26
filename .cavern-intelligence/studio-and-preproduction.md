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
| UI | `components/studio/**`, `studio.module.css` | Tabs: Overview · Library · Scenes · Production (Story / Schedule / Cast & crew) · Promos · Pitch · Share. |
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

- **Schedule**: shoot day and status per scene; auto-schedule
  (`packShootDays`: location clusters, day before night, ~5 pages/day);
  Breakdown → Budget from the elements the sync extracts from action lines;
  print; stripboard; call sheets.
- **Story**: beat board; character bible with a look-board per character
  (`character_media`).
- **Cast & crew**: crew, presence, recruiting, casting with each character's
  scene footprint.

## 6. Tests

- `lib/studio/*.test.ts` — alignment, classification, scheduling.
- `tests/integration/{media-library,scene-index,share-lookbook,realtime,activity-feed}.test.ts`
  — personas through PostgREST/Storage/Realtime/RLS.
- `e2e/studio-journey.spec.ts` — real browser, local stack: upload → link to a
  scene → editor → publish → logged-out share link → revoke → live crew sync.
  Runs in the CI `database` job.
