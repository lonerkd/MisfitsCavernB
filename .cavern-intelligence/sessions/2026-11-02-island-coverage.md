# Session — 2026-11-02: the island coverage reference

Step 0 of the island plan: what each page tells the island, read from the source rather than remembered. `lib/island/coverage.ts` reads every `usePillStage` / `usePillZone` call (module, title, field labels, toggles, action ids and labels; anything worked out at run time is shown as `(computed)`) and lists the route areas with no stage. `npm run island:coverage` writes `.cavern-intelligence/island-coverage.md`; `lib/island/coverage.test.ts` fails in CI when the file is stale (writer only with `UPDATE_ISLAND_COVERAGE=1`, never in CI), the same pattern as `parser-reference.md`.

**Found:** 6 stages (the plan said 5; the Lounge registers one through `useLounge`, which the reference now resolves to /lounge), 3 zones, and 12 areas that tell the island nothing (admin, auth, call, crew, hub, profile, settings, showcase, soundtrack, split, today, welcome). The plan and BACKLOG 4.1 now say so.

**Verified:** unit tests on sample source (strings with braces, conditional arrays, a zone with a computed title, hook definitions ignored), the full unit suite, typecheck, lint. No migration, no behaviour change.

**Left (S):** map each stage's actions to the ten fast-path slots, the Studio's views as zones, and the old-build screenshot comparison.

**Found in review (Copilot) and fixed:** spread entries (`...(user ? [{ label: 'Mine' }] : [])`) were dropped, so Jobs, Lounge and the production manager lost controls; they are now listed marked "(conditional)" (tested). A stage registered in a component (the Lounge) was reported as no stage; a registration is now assigned to the route whose files import it (tested), so `/lounge` is no longer in the list.
