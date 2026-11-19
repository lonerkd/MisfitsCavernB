# Session - 2026-11-19: a look takes a photo and its elements (BACKLOG 3.18 b)

**Migration `20261119000100`** (additive): `scene_states.media_id` (a library item of the same project; the photo going away clears the photo, not the look) and `scene_state_elements` (a look and the breakdown elements it is made of; the element or the look going away takes the link). RLS from birth through `internal.can_access_project`, as the look itself; snapshot and types regenerated.

In Continuity each look gets a photo chooser (with a thumbnail), chips for its elements and an add-element chooser (wardrobe, make-up and props elements). The wardrobe and make-up sheet prints "Items: ..." under each look.

**Decision (mine):** the photo comes from the project's library (no new upload path: one library, one place for files); elements are breakdown elements, so a coat is one thing across the script, the breakdown, the cost and the look.

**Verified:** typecheck, the print unit tests, persona tests (`tests/integration/film-graph-story.test.ts`: Sam, Jordan crew, Riley outsider and anon; another film's photo and element refused; both cascades), and `e2e/continuity.spec.ts` (new case: pick a photo and an element, rows in the database, survives a reload, remove) on a production build on the local stack. **To do after merge (RULES 5):** apply the migration to production, then staging, then the drift check.
