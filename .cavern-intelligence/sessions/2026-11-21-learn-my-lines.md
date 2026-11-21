# Session - 2026-11-21: Learn my lines (BACKLOG 3.51, performers)

The performer's call sheet (`/call/<id>`, **Your pages**) gets a **Learn my lines** switch: their own speeches (dialogue, parentheticals, lyrics) are hidden behind their first words ("Your line: You're…"), each reveals on a tap, and switching it off shows everything. Their cue name stays visible, the other actors' lines are always shown, and the pages still print as they were. `lineHint` and `isSpokenLine` in `lib/film/sides.ts` (pure, with unit tests); state is per visit, nothing is stored.

**Decision (mine):** the simplest honest rehearsal aid, from the pages the performer already has: no new data, no new access, nothing to sync. A self-tape tool needs recording and storage and stays open in 3.51.

**Verified:** typecheck, lint, unit tests (`lib/film/sides.test.ts`), and `e2e/performer-calls.spec.ts` (extended: with the switch on the line is hidden and its hint shown, tapping shows it, switching off shows it; the existing steps and the two other cases pass) on a production build on the local stack. **Not verified:** a phone (the button is a normal 44 px target, but not seen on a device).

**Bundle budget:** `/call/[id]` reached 364.5 kB against 364 kB with the learn-lines UI, so `performance-budget.json` allows 366 kB (intended weight, about half a kilobyte).
