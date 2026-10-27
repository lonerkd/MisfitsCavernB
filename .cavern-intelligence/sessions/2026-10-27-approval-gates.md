# Session — 2026-10-27: client-approval gates; advertising and copy formats

**Found first:** the film and series templates already exist — `project_formats`
rows (Feature, Short Film, Series, Limited Series, Web Series) with their own
phase names and skipped milestones, and the phase gate (carry or archive the
library) now sits on top. What was missing for the owner's description — "the
client signs off before the work moves on" — was an **approval gate**.

**Built:** `project_formats.approval_gates` (phases that cannot be left until the
client approves; set when adding a format at `/admin/formats`); a trigger on
`projects.status` that refuses a person moving the phase forward past one until,
for every script sent for review, the latest sent version is approved by the
client **and** confirmed by the team, and at least one was sent. It covers every
path (phase buttons, the gate dialog, the projects board, a jump over the gated
phase); going back is free; a format with no gates is unchanged; system updates
pass. The phase panel checks first and says why ("The client has not approved a
piece yet", "waiting for the team to confirm"). Two new formats: **Advertising**
(Brief → Concept & copy → Production → Finishing → Delivered, approval before
leaving Concept & copy) and **Copywriting** (Brief → Drafting → Delivered,
approval before delivery). Migration `20261031000600_approval_gates.sql`.

**Tests:** `tests/integration/approval-gates.test.ts` (13, run with the trigger
disabled to prove they bite: 6 fail, all pass with it); `approvalBlocker` and
the format check in unit tests.

**Not done:** the copy editor (two-column spots, character limits), campaigns and
deliverables, brand rules as approved references (BACKLOG 3.32 b–e); the
projects-board drag shows the database's refusal as a generic error; games, music
and books formats; gates on items other than scripts (media versions).
