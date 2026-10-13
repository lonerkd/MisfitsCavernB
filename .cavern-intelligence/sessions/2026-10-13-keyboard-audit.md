# Session — 2026-10-13: a keyboard-only audit

**Added:** `e2e/keyboard-audit.spec.ts` (opt-in, `E2E_LOCAL_STACK=1`): signs in against the local stack, tabs through 30 routes, and writes `e2e/keyboard-audit.json` (git-ignored). It reports mouse-only controls (pointer cursor, not focusable), focus that stays put, stops with no outline or shadow, and focusable controls that tabbing never reached. It reports; it does not fail the run.

**First run (local stack, production build):** 44 findings — 3 "focus stays" (project page `Answer` button, the editor's script textarea, the profile's `away-from` date input), 40 "no focus ring" (mostly `select`/`input`/`textarea`, which probably show focus with a border colour change that the check does not count), 1 unreached (project page: 125 controls, tabbing reached 29). 0 mouse-only controls found.

**Read with care:** the "no focus ring" list is likely mostly false positives; the project page's unreached controls and the three stuck stops are the ones to look at first. Nothing is fixed yet; this PR is the instrument.

**Verified:** the audit ran to completion (1 passed, 2.0 min). **Not verified:** CI, other browsers, the fixes (none made).
