# Session - 2026-11-23: a flaky unit run, fixed at its source

The `checks` job failed now and then with "ReferenceError: window is not defined" from `BudgetLines.tsx` (an unhandled rejection raised after all 452 test files had passed), which blocked unrelated PRs (#756, #760 and others). `loadFringes` set state from its promise handlers even when the view was gone (the test had finished and jsdom was torn down); a read that finishes after unmount now does nothing (`mounted` ref). No behaviour change while the view is open.

**Verified:** typecheck, lint, the `BudgetLines` tests (6, run several times). The flake itself only appeared in CI under load, so its absence there is the real check.
