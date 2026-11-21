# Session - 2026-11-21: the cost on the Studio scene cards (BACKLOG 4.6 slice 1, left item)

Each scene card in Studio > Scenes shows its cost ("Cost $1,050"), read from the breakdown the same way Studio > Production > Money reads it. The tooltip and the screen-reader text say how much rests on a category's default estimate and how many elements have no price.

- `lib/studio/scene-cost.ts`: `costNote` (the Money table's note, moved here so both screens share one copy) and `sceneCostFact` (a scene's cost as the card shows it). Pure, tested in `lib/studio/scene-cost.test.ts`.
- `components/studio/production/MoneyView.tsx`: uses `costNote` instead of its local copy. Its output is unchanged.
- `components/studio/tabs/ScenesTab.tsx`: reads `budget.read` once; `useBreakdown` gets a null project id for crew without it, so no breakdown loads for them. `sceneCosts` runs once for the tab and each card gets its own scene's cost. No cost is shown while the breakdown is loading or has failed.
- `components/studio/tabs/ScenesTab.test.tsx`: the fact shows with `budget.read`, not without (and crew read no breakdown), and not while loading or on error.

**Verified:** `npx vitest run components/studio lib/studio` (81 files, 468 tests pass); `npx tsc --noEmit` exit 0; eslint on the changed files exit 0.

**Not verified:** the cards in a browser (layout of the new line, and how the tooltip behaves on a phone). The Stripboard still has its own tooltip wording; moving it to `costNote` is left for later.
