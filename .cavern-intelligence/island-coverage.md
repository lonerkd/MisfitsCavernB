# The island coverage reference

> **Generated** by `npm run island:coverage` from the source — never edit by hand. `lib/island/coverage.test.ts` fails when this file is stale. It is step 0 of [the island plan](plans/2026-11-02-island-at-every-size.md): the island is only as deep as what pages tell it, so this is what the design is argued from.

**6 stages** (a page describing itself to the island) and **3 zones** (a hover or focus area with its own controls) are registered. Areas with no stage get only a fallback name and next places from `lib/island/routes.ts`.

## Areas with no stage

`/admin` · `/auth` · `/call` · `/crew` · `/hub` · `/lounge` · `/profile` · `/settings` · `/showcase` · `/soundtrack` · `/split` · `/today` · `/welcome`

## Registrations

| Where | Kind | Title | Fields | Toggles | Actions |
| --- | --- | --- | --- | --- | --- |
| `app/(suite)/editor/page.tsx` | stage | (computed) | `Scene` · `Words` · `Pages` · `Save` | `Focus` | `find` Find & replace |
| `app/(suite)/jobs/page.tsx` | stage | (computed) | `Open` | — | `post-job` + Post Position |
| `app/(suite)/portfolio/page.tsx` | stage | The Cavern Collection | `Works` | — | — |
| `app/(suite)/projects/page.tsx` | stage | Projects | `Total` | — | `new-project` + New Project |
| `app/(suite)/studio/page.tsx` | stage | (computed) | `Tab` | — | `next-tab` Next tab → |
| `components/editor/EditorCenterViews.tsx` | zone | (computed) | `Cast` · `Words` | — | `jump-scene` → Jump to Scene |
| `components/lounge/useLounge.ts` | stage | (computed) | `Online` · `Msgs` | — | `lounge-search` Search messages |
| `components/projects/hub/ProductionManager.tsx` | zone | (computed) | `Planned` | — | — |
| `components/studio/CrewBoards.tsx` | zone | (computed) | `Role` · `Status` | — | `message-crew` → Message in Lounge |

Titles and labels shown as `…` or `(computed)` are built at run time (a count, a name); the table lists what the source says.
