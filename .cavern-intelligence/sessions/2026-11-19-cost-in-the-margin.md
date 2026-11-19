# Session - 2026-11-19: what a scene needs, in the script's margin (BACKLOG 3.18, graph step 5)

The editor's left margin (story day, time, shoot day beside each scene heading) now also shows **what the scene's tagged elements cost** ("$140"), from the same prices as Breakdown › Cost by day (`costByScene`, an element's own price or its category's unit cost). Quiet by default: a scene with nothing priced shows nothing, and a scene with only a cost still gets a margin note. The note's accessible name says it ("needs 140 dollars"). Read only: nothing it shows is written into the script. `sceneGutter` takes the costs as an optional fourth argument, so every other caller is unchanged.

**Verified:** typecheck, lint, unit tests (`lib/film/gutter.test.ts`: cost only when priced, a cost-only scene, the label), and `e2e/editor-gutter.spec.ts` (new case: a priced prop tagged in the first scene appears as "$140" beside it live, the script untouched; the two existing cases still pass) on a production build on the local stack. **Not verified:** a phone (the margin hides below 720 px, as before, so the figure is not on a phone at all); long projects (the sum is computed per render of the tags).

**Left in step 5:** labour from who works which days.
