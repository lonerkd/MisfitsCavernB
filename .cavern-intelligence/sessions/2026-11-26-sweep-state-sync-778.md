# Sweep STATE sync — #778 garbled-merge fix (2026-11-26)

## What

Hourly sweep sync PR. #778 merged 17:48 CST (fix(scriptos): health-gated sends
and collision-free script seeding, 3.33): the garbled merge's two remaining
mechanisms are fixed — sends now follow connection health through a
`BroadcastGate`, and script seeds no longer share one baseline client id
(`baselineClientIdFor`). #778 already updated `backlog-detail.md` §3.33 and
`bible/inventory.md` itself, so this PR only refreshes the STATE.md handoff:
it now records #778, and the nightly sentence names #778's fix alongside #774,
#775 and #776. Leftovers (ii) the ~1-in-6 cowriting flake and (iii) the
two-browser live check stay open, unchanged.

## Why a sync PR

STATE.md's handoff ended at #776; a merged PR that closes a backlog leftover
must be visible in the handoff, or the next session starts from a stale resume.

## Verified

- `node scripts/check-state-facts.mjs` — no warning (newest migration on main
  still `20261123000300`; the migration line is unchanged and correct).
- `npm run sync-intel` — no drift; `npm run bible` — no drift.
- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` — see
  the PR's Verified line for the numbers.
- No migration in this PR or in #778; drift green since run 45528198994.
- #778 itself merged green (gate, checks, conventional, risk success on head
  `18411cf8`; the 17:39 Gate failure mail was on the earlier head `072d091`,
  fixed before merge). Main CI on the #778 merge commit `2e07772f`: checks and
  database success; Supabase Preview failure is the known standing condition
  (fails on every main merge, not a required check).
- #731 still open, 20 comments, unchanged since 07:28 CST. Tonight's nightly
  (~04:40 CST Nov 27) is the fourteenth test and the first run on the fixed
  HEAD including #769, #774, #775, #776 and #778.
