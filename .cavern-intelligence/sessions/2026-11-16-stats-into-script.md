# Session — 2026-11-16: the centre Stats view folded into the rail's Script section (BACKLOG 3.42)

The editor's centre "Stats" view is now the **Analytics** section at the top of the right rail's **Script** section (the tab, formerly "Insights", is named Script as the plan says).

- `components/editor/ScriptAnalytics.tsx` is the old `StatsView` moved out of `EditorCenterViews.tsx` and made rail-sized: a two-column number grid, the runtime panel, scene timeline, character presence, dialogue against action, the scene table (scrolls sideways rather than squeezing) and the script health counts. Same data and handlers (jump to a scene, table read from a scene).
- `EditorSidePanels` takes an `analyticsPanel` and shows it as a collapsible section; the page passes it. The Stats button (header) and the Stats entry in the phone View sheet are gone; on a phone the analytics are in Tools › Script. Nothing else set the `stats` view (no deep link, no key chord), so no redirect was needed.
- `e2e/table-read.spec.ts` now opens the Script section instead of clicking Stats (not run: needs the local stack).
- Tests: `components/editor/ScriptAnalytics.test.tsx` (numbers, regions, jump, empty script, the rail section collapsing and showing only on Script).
- Checks run: typecheck, lint (0 errors), test (3029 pass), build.

**No browser check was done.** The rail is 272 px wide: the layout of the number grid, the timeline and the presence chart there is unseen, as is the e2e spec's run. The Script section is now long; the owner may want the analytics collapsed by default.
