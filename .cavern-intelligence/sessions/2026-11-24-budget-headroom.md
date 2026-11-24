# 2026-11-24 — Bundle budgets get pre-launch headroom

Owner's call: the bundle budget kept blocking merges by fractions of a kB
(/editor 519.3 vs 519, /pitch 449.3 vs 449 in the Nov 24 queue) while the
suite is still growing toward launch. Every route in
`performance-budget.json` now carries deliberate headroom: the suite
surfaces under active build (/editor, /studio, /lounge, /call/[id],
/projects/[id], /projects/[id]/pitch, /soundtrack, /today) +15%, all other
routes +10% with a +25 kB floor. The file's note records the policy: this
is pre-launch headroom, and the numbers get re-baselined to measured sizes
at the Reveal Gate, when growth stops. The gate still fails a page that
blows past its buffered budget — the tripwire moved, it did not come off.

Verified: the CI checks job (which runs the bundle-budget step) on the PR.
Config only; no user-visible change.
