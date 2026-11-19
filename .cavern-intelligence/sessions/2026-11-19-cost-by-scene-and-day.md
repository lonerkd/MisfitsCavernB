# Session - 2026-11-19: what a scene and a shoot day cost (BACKLOG 3.18, graph step 5)

The breakdown already priced elements (their own cost, else the category's unit cost) and tagged them to scenes; nothing read those two together. `costByScene` and `costOfScenes` (`lib/breakdown/core.ts`) do: a scene costs the elements tagged in it; a shoot day costs the **distinct** elements across its scenes (a lantern in two scenes on one day is bought once; the same lantern on two days counts on both, so day costs can add up to more than the project total, and the screen says so). Breakdown gets a **Cost by day** tab (each day, its scenes, unpriced elements called out) and every scene sheet shows its cost.

**Decision (mine, 3.18 was handed over):** read-only, from the data that exists; no new table. Labour by day and cost in the script's margin stay in 3.18 (they need the timesheet link and the editor's gutter).

**Verified:** typecheck (app and e2e), unit tests for the two functions (the shared-element cases), and `e2e/breakdown-cost.spec.ts` (new) plus `e2e/breakdown.spec.ts` on a production build on the local Supabase stack. Not verified: nothing on a phone; the print of the breakdown sheets does not carry the cost yet.
