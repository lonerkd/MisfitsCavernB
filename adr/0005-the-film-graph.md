# 0005. The film graph: one connected core, reached one tool at a time

- Status: Accepted
- Date: 2026-10-10

## Context

The suite described the film several times over, in text: a scene's location
was a string matched by name to its record, its cast a comma-separated
string, its shoot day a bare number that the call sheet repeated as another
bare number; costs, tasks and documents pointed at nothing. Every tool kept
its own list, and the person using it was the integration layer. The owner's
direction (2026-10-10): one normalised, connected core — "everything must be
connected".

Three ways there were weighed: a derived read-model with no schema (nowhere
to store story days, continuity or coordinates); a derived model plus a few
stored facts; a normalised graph that every tool reads and writes. The owner
chose the third.

## Decision

We build the normalised graph (`.cavern-intelligence/film-graph-spec.md`) in
two layers, and we get there without a big-bang rewrite:

- **The spine** — the relationships the tools compute on are real foreign
  keys (scene → location, scene ↔ character, scene → shoot day, call sheet →
  shoot day, character → person), same-project by construction
  (`(id, project_id)` pairs).
- **The universal layer** — `entities` and `links`, so anything (a task, a
  document, a cost, a mention) attaches to anything.
- **The route is a strangler:** each step adds links beside the old columns,
  backfills them, keeps both in step with triggers (the text and numbers stay
  correct while old code reads them), moves tools onto `lib/film` one at a
  time, and only then drops the old columns. Each step ships a tool a
  filmmaker can use; none is plumbing alone.
- **`lib/film/`** is the one pure, unit-tested read-model the tools read.

Step 1 (this record's first application): `shoot_days`, `scenes.location_id`,
`scenes.shoot_day_id`, `call_sheets.shoot_day_id`, location coordinates — and
the day's light, computed locally, on the locations view, the stripboard and
the call sheet.

## Consequences

- Change ripples: a date set on the schedule is the call sheet's date; a
  location told where it is lights every day it shoots.
- For the length of the move there are two representations of the same fact.
  The links are the truth and the old columns the copy; triggers keep them in
  step, and the last step (dropping the copies) is not optional.
- Triggers run as the person writing and only touch rows of the same project
  under the same policy — no new `SECURITY DEFINER` surface.
- Every schema step needs its backfill proven from a clean database, the drift
  snapshot and persona tests, as any migration here does.
- It is the largest piece of work the suite has had; stalling halfway would
  leave it worse than before it started.
