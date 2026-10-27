# The graph cutover — audit (2026-10-27)

Owner direction (2026-10-27): the redesign starts at the core, not the screens.
Order: **(1)** every tool reads the film graph and the old text columns go;
**(2)** the universal link layer and the card (film-graph-spec step 4);
**(3)** navigation and each tool's layout, designed around the card and the
graph, in every theme; **(4)** the editor on the graph (its own plan,
`2026-10-11-editor-integration.md`). This note is step 1's measurement: what
still reads the text, from `grep` over `app/`, `components/` and `lib/`.

## The three text shapes still in use

| Text shape | Graph replacement (already in the schema) | State |
|---|---|---|
| `scenes.cast_list` (comma-separated names) | `scene_characters` (scene → character id); `lib/film/cast.ts` `castOfScene` falls back to the text | Continuity and the Casting board read the links; **everything below still reads the text** |
| `scenes.location` (a name) matched by `locationKey()` | `scenes.location_id` → `project_locations` | `lib/film/studio.ts` resolves ids; **the readers below still match by name** |
| `scenes.shoot_day` / `call_sheets.shoot_day` (bare integers) | `scenes.shoot_day_id` / `call_sheets.shoot_day_id` → `shoot_days` | `lib/film/days.ts` builds days; **the production tools below still group by the integer** |
| `call_sheet_calls.character_name`, `character_castings.character_name` | `character_id` on both | Casting reads by id in places; the call sheet and the script reader (`lib/scriptos/context.ts`) still use names |

## Readers to cut over (by file)

**`cast_list`** (10 sites): `lib/studio/stripboard.ts` `castOf` (drives stripboard
conflicts), `lib/studio/readiness.ts`, `components/studio/production/ReadinessView.tsx:93`
(splits the text to find uncast characters), `CallSheetsPanel.tsx:36` (the call
sheet's cast list), `OnSetView.tsx:311`, `components/studio/tabs/ScenesTab.tsx:193`,
the public `app/(suite)/call/[id]/page.tsx:192`, and `lib/studio/api.ts:23,462`
(the call-sheet scene query selects the text). **Writer:** `lib/studio/scene-sync.ts`
derives `cast_list` from the script on every sync — it stays until the last
reader is gone, then the column is dropped.

**`scenes.location` by name** (9 sites): `StripboardView.tsx:239`,
`CallSheetsPanel.tsx:35`, `lib/studio/stripboard.ts:38`, `readiness.ts:61`,
`shoot-days.ts:33`, `lib/studio/locations.ts:61`, `scene-sync.ts:70,197`.

**Shoot day as an integer** (the widest): `StripboardView` (moving a scene
sets `shoot_day`), `OnSetView`, `CallSheetsPanel` (`sheetFor(day)`), `ReadinessView`,
`BreakdownView`, `CastingBoard`, `LocationsView`, `lib/today/core.ts`,
`lib/today/owner.ts`, `lib/supabase/today.ts`, `lib/availability/core.ts`,
`lib/studio/api.ts`, `lib/brief/core.ts`. Scenes carry both the integer and
`shoot_day_id`; nothing yet treats the id as the truth.

**`character_name`**: `CallSheetsPanel.tsx` (7 sites — a call is found by name),
`lib/studio/call-sheet.ts`, `documents.ts`, `lib/studio/api.ts`, `lib/credits/core.ts`,
jobs (`jobs/[id]/page.tsx`, `JobCards.tsx`, `lib/supabase/jobs.ts` — casting calls
post a character by name).

## What does not exist at all

- **Step 4 — the universal link layer.** No table links "anything to anything"
  (a task, document, media item, money line, note or message to a scene,
  character, location or day). `tasks`, `documents`, `media` and `budget_items`
  still say what they are about with a title or a category string.
- **The card.** No single component opens "this character / location / scene /
  day" the same way from everywhere; each tool draws its own row.
- **Mentions.** Nothing in the editor or the Lounge resolves `@character` or
  `#scene` to a row.

## Order of work for step 1 (each ships alone, behind no flag where it only changes where the data is read from)

1. **Stripboard + readiness + call sheet cast** read `scene_characters` through
   `castOfScene` (the helper already exists). Biggest user-visible win: conflicts
   and "uncast" stop depending on how a name was typed. **M.**
2. **Call-sheet calls and castings by `character_id`** (cast on the sheet follows
   the schedule and survives a rename); jobs' casting calls keep the name for
   display and gain the id. **M.**
3. **Locations by `location_id`** in the stripboard, call sheet, readiness and
   shoot-day grouping. **S–M.**
4. **Shoot days by `shoot_day_id`**: one `ShootDay` object everything shares;
   the integer becomes a derived label. Touches the most files. **M–L.**
5. **Drop the text columns** (`cast_list`, `location`, the integer days,
   `character_name`) and the writer in `scene-sync.ts`; migration, snapshot,
   types, persona test. Done when `grep` finds no reader. **S.**

Then step 4 (links + card) gets its own spec.

## Risks

- `scene-sync.ts` rewrites the text from the script on every save; until the
  columns go, two sources exist. Each cutover must make the graph win, never the
  text, or a rename in the script silently undoes a manual link.
- Offline: On set caches scenes by the integer day today
  (`e2e/onset-offline.spec.ts`); the cutover must carry ids into that cache.
- The public call page (`/call/[id]`) is an outsider surface — its data function
  must keep returning only what a call sheet link may show.
