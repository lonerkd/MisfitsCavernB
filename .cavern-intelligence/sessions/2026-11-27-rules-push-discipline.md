# The push discipline moves into RULES 9

Owner direction, Nov 27, 2026: codify the deploy rules, remove the
bloat, refine and optimize. The owner also owned the diagnosis with
the lead agent: the Nov 26 cap was hit by one-PR-per-catch work with
repeated pushes, against a rule that existed only as a vague
principle in RULES 9 plus an operational line buried in STATE §2b —
a handoff doc that churns hourly is the wrong home for a binding
rule, and the vague version is the one that got "followed" while the
cap burned.

## What changed

- **RULES 9** now carries the operational discipline itself:
  pushes are the scarce resource; batch related changes into one
  PR; verify fully locally before the first push, so a PR takes one
  push to open and at most one refresh push right before merge;
  keep 2–3 PRs open; never chase a moving main with refresh pushes;
  migrations, auth changes and risk-high work ride solo, never in a
  pool. The two cap hits (2026-11-15, 2026-11-26) are named in the
  rule with their shared cause.
- **Working-without-being-asked §3** points at rule 9 instead of
  restating a fragment of it.
- **STATE §2b** shrinks to a pointer at RULES 9 — the duplicated
  operational text is gone from the handoff doc.

## What did not change, deliberately

No new CI check. Push counts are not visible to a gate (CI sees one
head, not a branch's push history), so a mechanical check would be
theatre; the gate keeps enforcing what it can see (tests, session
notes, Verified lines, the lint baseline). The discipline is a rule
agents read at session start — which is why it now lives in the
file every session reads first.
