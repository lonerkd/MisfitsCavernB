# Session — 2026-10-27: phase gates (D3), on the phase engine that already exists

**Found first:** a phase engine already existed — five phases, renamed or skipped
per project format (`project_formats.phase_labels` / `skip_phases`), stored in
`projects.status`. So the spec's `format_phases` table would have duplicated it;
D3 became the **gate** only, and the spec was revised to say so.

**Built:** migration `20261031000000_phase_gates.sql` — `media.lifecycle`
(`working` | `archived`, changed only by people who shape the project, enforced
by `media_lifecycle_guard`), `phase_gates` (a record of each gate; no write grants)
and `advance_phase(project, to, decisions)` (owner only; archives the chosen
items — also taking them off the public share link — and moves the phase, in one
transaction). UI: the PhasePanel asks, when the owner moves forward, what each
library item does (`PhaseGate`; production and later default to archive, earlier
phases to carry on); the Library hides archived items behind "Show archived";
MediaDetail has Archive / Restore for people who shape the project.

**Flag:** `phase_gates` — local and preview on, production admins only.

**Tests:** `tests/integration/phase-gates.test.ts` (7: only the owner passes a gate,
bad input changes nothing, decisions and the phase move together, archive unshares
and keeps the item, the record is readable by crew and not writable, another
project's item is untouched, viewers and outsiders can't archive or restore),
`lib/studio/gate.test.ts` (4).

**Not done:** gating items other than the library (scripts, documents); an
"Archived" badge on grid cards when shown; the projects-board drag still moves a
phase without the gate; shapers other than the owner passing a gate; D2 lifecycle
`approved` and audience layers. **Not applied** to production or staging.
