# The role tools linked to the film graph (sketch, 2026-11-08)

BACKLOG 3.38. Nothing here is built. This is the design to approve first, because it changes what every record stores.

## The problem

Nine of the 17 role tools carry a **scene** typed as free text, and two (Costumes, Makeup) a **character** typed as free text:

| Tool | Typed fields |
|---|---|
| Camera reports, Sound reports, Script supervisor, Director's notebook, VFX shots | `scene` |
| Costumes, Makeup | `character`, `scene` |
| Rehearsals | `scenes` (several, one text field) |
| Gear, Comms, Permits, Purchase orders, Risk register, Scouting, Wrap, Media offload, Safety | none |

The film graph (`scenes`, `characters`, `scene_characters`, locations, shoot days) already holds the real rows, so a typed "12" or "Maya" is one more place that can drift from the script: a renumbered scene, a renamed character or a typo leaves the record pointing at nothing, and nothing can answer "everything we have shot or recorded for scene 12".

## Design

1. **Two columns on `production_records`, not buried in the JSON**: `scene_ids uuid[]` and `character_id uuid`. Reason: a foreign key can say "this scene is in this project and when it is deleted the link goes", a jsonb value cannot. `scene_ids` is an array so Rehearsals keeps its several scenes; a one-scene tool uses one element. Integrity through a trigger (an array cannot carry a foreign key): every id must be a scene of the record's own project, and a deleted scene is removed from the arrays (a trigger on `scenes`), so no record points at nothing. `character_id` is a real foreign key to `characters(id, project_id)` with `ON DELETE SET NULL`.
2. **Keep the typed text as a label, never as the truth.** `data.scene` / `data.character` stay as the text the person typed or the label at the time of linking; the link wins when present. A record whose scene was deleted keeps its label and shows it as "(scene removed)". Nothing the person already wrote is lost.
3. **One shared picker** (`SceneField`, `CharacterField` in `components/studio/production/`): a select of the project's scenes ("12 · INT. KITCHEN - DAY", numbered the way the Stripboard names them) or characters, with a "type something else" escape for a scene that is not written yet (the label only, no link). Each of the 9 views swaps its text input for the picker; their Add forms are otherwise unchanged.
4. **Backfill** in the migration: match each record's text to a scene by scene number or heading within its project, and to a character by name (upper-cased, as `characters.name` is); ambiguous or unmatched text stays a label only. The migration reports nothing silently dropped.
5. **What it buys**: the scene card and the entity card can list a scene's camera reports, sound reports, costumes and notes; a deleted scene stops leaving dead text; Costumes and Makeup can say who is in the scene and warn when a look is planned for a scene the character is not in (a report, never a change).
6. **RLS** unchanged (read `can_access_project`, write `can_shape_project`); the guard trigger gains the project check above. Persona test: a record cannot link to a scene of another project (the thing that would leak across projects), crew link in their own project, an outsider reads nothing, deleting a scene clears the link and keeps the label.

## Build order

1. Migration: the two columns, the integrity triggers, the backfill; persona test; snapshot and types. (M)
2. The pickers and the nine views; the hook passes `scene_ids` / `character_id` through; unit tests per view. (M)
3. The scene and entity cards list a scene's records; the Costumes / Makeup "not in this scene" report. (S–M)
4. A browser spec: crew link a camera report to a scene, rename the scene's number, the record still shows it. (S)

## Decisions for the owner

1. **Several scenes per record or one?** Rehearsals needs several; Camera and Sound reports are one scene each. Recommendation: the array for all (one picker that allows one or more), so a continuous take across scenes is expressible.
2. **A scene that is not written yet:** allow a label-only record (recommended: shoot notes often precede the script), or require a real scene? Requiring one is cleaner data but blocks a note on something the script does not have yet.
