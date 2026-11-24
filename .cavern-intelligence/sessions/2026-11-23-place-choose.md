# Session - 2026-11-23: choose a place the project already has (BACKLOG 3.18, E4)

Renaming a place from the editor to a name the project already had failed on the locations table's unique name. The rename field now offers the project's existing places (a datalist, loaded when the form opens), and naming one is *choosing* it: the headings are rewritten to that place and the scenes join its record when the script syncs. The record left behind is not deleted (it may hold a permit, a contact or a cost): the toast says it is still in Locations to merge or remove. A new name renames the record as before. `planPlaceChange` (`lib/film/rename-location.ts`) is the pure decision. No migration.

**Verified:** typecheck, lint, `lib/film` and `components/editor` unit tests (a new name renames, an existing name is chosen with the old record left, no record is a text rewrite, spelling and case do not matter). The browser flow is not looked at.
