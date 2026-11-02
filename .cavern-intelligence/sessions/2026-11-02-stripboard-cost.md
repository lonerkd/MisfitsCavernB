# Session — 2026-11-02: the stripboard shows what a scene and a day cost

The Money tab's cost by scene and day (`lib/studio/scene-cost.ts`) now also appears on the stripboard: each strip shows its scene's cost beside its cast and element counts (and says it in its accessible name: "Scene 1, …, costs $90, planned"), and each day's stats line shows the day's total. A tooltip says how much of it rests on a category default or that an element has no price (so the figure is low). Same function, same numbers as Money, nothing recomputed differently; nothing shows while the breakdown is loading or failed to load, because a half-read breakdown would put wrong money on the board.

**Verified:** a real browser (`e2e/scene-cost.spec.ts` extended: after the Money assertions, the Schedule view shows Scene 1 at $90, Scene 2 at $50 and Day 1's $90); typecheck, lint, the bundle budget (`/studio` 363.2 of 364 kB: 0.8 kB of room left, so the next addition to the Studio needs a budget conversation); unit tests unchanged. No migration.

**Left:** the scene cards, and day rates × days.
