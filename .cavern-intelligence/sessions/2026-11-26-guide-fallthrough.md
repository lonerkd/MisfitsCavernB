# 2026-11-26 — Guide: Advertising and Copywriting stop falling through to the short-film guide

Slice 0 of the brief/guide redesign (spec: BRIEF-GUIDE-REDESIGN.md; audit:
brief-format-coverage-audit.md). `pickWorkflow`'s hard-coded chain never
matched the Advertising or Copywriting formats, so those projects silently
got the short-film guide — casting, breakdown, shoot days and all — for a
copy project.

- Two workflows added to `lib/guides/workflows.ts`, built from the existing
  step library the way the blog workflow is: `advertising` (client brief →
  concepts → copy → client sign-off → variants delivered) and `copywriting`
  (brief → draft → sign-off → handover). Neither contains a film-set step.
- `pickWorkflow` routes both formats; Commercial keeps its shoot workflow.
- `lib/guides/workflows.test.ts` pins the routing, the no-film-set-steps
  property, and that every step id any workflow names exists in the library.

The deeper fix — workflows as data on the format row, so a format can never
fall through a code chain again — is Slice 5 territory in the spec; this
slice stops the visible harm inside the current mechanism.
