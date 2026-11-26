# 2026-11-26 — Film graph cutover, the remainder: calls keyed by character id, and the crew sheet's place by link (BACKLOG 3.18a)

The last two name-keyed readers in the call-sheet flow now read through the
graph. Everything else in the column cutover was already recorded finished in
3.18; this PR does not redo any of it, and no column is dropped — `character_name`
stays, as the printed label and as the trigger input it has always been.

## What changed

- **Call-sheet calls are matched by `character_id`.** `CallTarget` (in
  `lib/studio/api.ts`) is now `{ character_id, character_name }` for a cast
  call. Matching and reading key on the id alone, through one pure helper,
  `findCall` — two characters who share a name, or one renamed since its call
  was saved, can no longer claim each other's call. Writes keep sending the
  name as the label: the `calls_link_character` trigger (migration
  `20261102100000`) derives the row's `character_id` from that name, so the id
  written and the id matched on agree by construction.
- **The enablers.** `lib/film/cast.ts` gains `castIdsByScene` /
  `castIdsOfScene`, parallel to `castByScene` / `castOfScene` and in the same
  name order, so a scene's names and ids zip index-for-index. `StudioContext`
  exposes `castIdsOf` beside `castOf`. `CallSheetsPanel`'s `dayFacts` now
  returns `castEntries` (`{ id, name }`, deduped by id), and the panel's
  print, sides and editor paths all go through the id: print looks each call
  up by id, sides find the casting by `character_id` (the `useCastings`
  select in `lib/studio/index.ts` now returns it; `CastingRow` carries it),
  and the "Text it" body reads the issued snapshot through `issuedCallFor`
  (`lib/studio/call-sheet.ts`), which prefers the snapshot's existing
  `cast_by_id` filing and falls back to `cast_calls` by name for sheets
  issued before `cast_by_id` existed.
- **The crew call-sheet view's scene place.** `getCallSheetView` now selects
  `location_id` with the scene and reads the project's `project_locations`;
  each scene's `location` is filled through `placeResolver` — the linked
  record's current name, with the scene's own text as the fallback when the
  link is absent or gone. A renamed place now reads under its new name on the
  crew's sheet, as it already did in the Studio.

## Deliberately not built (unchanged scope calls)

- **Casting notes and candidates stay name-keyed in the schema**
  (`lib/supabase/casting.ts`, the Casting Board): keying them by character id
  needs a migration — the same trigger pattern as calls — and is a separate
  slice, recorded in 3.18 below rather than built here.
- **Shoot days by `shoot_day_id`** remains the owner's design question, and
  the **E4 offline queue for editor row writes** is untouched, as scoped.

## Verification

Unit tests first (they failed on the old code for exactly these behaviours):
`castIdsByScene` name-order alignment and same-name separation
(`lib/film/cast.test.ts`), `findCall` id matching incl. duplicate names and a
stale name, `saveCall`'s insert payload carrying both id and name, and
`getCallSheetView`'s linked-place resolution with text fallback
(`lib/studio/api.call-target.test.ts`), and `issuedCallFor`'s
prefer-id/fall-back-to-name reading (`lib/studio/call-sheet.test.ts`).
Persona-level coverage added to `tests/integration/call-sheet-view.test.ts`
(a renamed location record reads through on the crew view; a cast call saved
through the API lands on its character id) — integration tests need the local
stack, so they run in CI's database check, not in this session.
Local: typecheck, lint, the full unit suite and a production build (results
in the PR). Not verified in a browser: this session has no live browser; the
panel changes are covered by the unit tests above and the PR's preview.
