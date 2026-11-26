# Session - 2026-11-23: Breakdown leads with readiness; the rates sheet fits a phone

Finished work left uncommitted by a crashed session. No migration.

- **Readiness first**: the Breakdown tab opens on `BreakdownFocus` (`lib/studio/breakdown-focus.ts`, pure, unit tested): the project's phase and milestones, scenes with nothing tagged, elements still needed or unpriced, and cost against the budget (read only with `budget.read`). Each item names where it is fixed (another tool, or *Push to budget* / *Categories & rates* / *Show what is missing* in the tab). A project with no phases gets no checklist.
- **Categories & rates sheet**: named grid areas (swatch, name, rate, element count, reorder / delete), 44 px targets, re-stacks under 760 px so the name is not squeezed; `Modal` gains a `compact` head (title and Done on one row on a phone).
- `e2e/breakdown-categories-phone.spec.ts` covers the sheet and the readiness panel.

**Verified:** typecheck, lint (0 errors), unit tests. **Not verified:** the e2e spec (needs a local stack), and nobody has looked at it in a browser.
