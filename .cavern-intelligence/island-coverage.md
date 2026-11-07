# The island coverage reference

> **Generated** by `npm run island:coverage` from the source — never edit by hand. `lib/island/coverage.test.ts` fails when this file is stale. It is step 0 of [the island plan](plans/2026-11-02-island-at-every-size.md): the island is only as deep as what pages tell it, so this is what the design is argued from.

**6 stages** (a page describing itself to the island) and **3 zones** (a hover or focus area with its own controls) are registered. Areas with no stage get only a fallback name and next places from `lib/island/routes.ts`.

## Areas with no stage

`/admin` · `/auth` · `/call` · `/community` · `/crew` · `/hub` · `/profile` · `/settings` · `/showcase` · `/soundtrack` · `/split` · `/today` · `/welcome`

## Registrations

| Where | Kind | Title | Fields | Toggles | Actions |
| --- | --- | --- | --- | --- | --- |
| `app/(suite)/editor/page.tsx` | stage | (computed) | `Scene` · `Words` · `Pages` · `Save` | **Q** `Focus` | **E** `find` Find & replace · **I** `sprint` (computed) |
| `app/(suite)/jobs/page.tsx` | stage | (computed) | `Open` · `Shown (conditional)` · `Mine (conditional)` | — | **Q** `post-job` + Post Position (conditional) |
| `app/(suite)/portfolio/page.tsx` | stage | The Cavern Collection | `Works` | — | — |
| `app/(suite)/projects/page.tsx` | stage | Projects | `Total` | — | **Q** `new-project` + New Project (conditional) |
| `app/(suite)/studio/page.tsx` | stage | (computed) | `Tab` | — | **R** `next-tab` Next tab → · **T** `open-share` Share tab (conditional) |
| `components/editor/EditorCenterViews.tsx` | zone | (computed) | `Cast` · `Words` | — | **W** `jump-scene` → Jump to Scene |
| `components/lounge/useLounge.ts` | stage | (computed) | `Online` · `Msgs` · `Unread (conditional)` | — | **E** `lounge-search` Search messages · **R** `lounge-pinned` Pinned (conditional) |
| `components/projects/hub/ProductionManager.tsx` | zone | (computed) | `Planned` · `Actual (conditional)` | — | **Q** `post-job` → Post as Job (conditional) |
| `components/studio/CrewBoards.tsx` | zone | (computed) | `Role` · `Status` | — | **Y** `message-crew` → Message in Lounge |

**Deck keys** (bold) are the Caps Lock keys the island gives each control. An action with a slot (`lib/island/slots.ts`) has the same key on every page; the other controls fill the free keys, toggles first, then actions, then the route's links from `lib/island/routes.ts`, which this table does not list. A `~` means a conditional control comes before an unslotted one, so its key can move. Actions still without a slot are the ones whose key moves from page to page.

Titles and labels shown as `…` or `(computed)` are built at run time (a count, a name); the table lists what the source says.
