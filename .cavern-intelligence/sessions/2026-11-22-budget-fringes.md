# Session - 2026-11-22: Budget fringes and per diems (competitor parity gap 3)

The mechanism, not a rate book: no union table ships. Migration `20261122000500_budget_fringes.sql` (still to apply to production, then staging, then the drift check).

**Design.** `budget_fringes` (a project's named rates: percent 0-100, optional cap per line) and `budget_item_fringes` (the link, composite foreign keys keep line and fringe in one project). Chosen over a jsonb column because the database checks the link and a rate is one row. `budget_items.amount` stays the BASE; new `fringe_amount` is kept by a `BEFORE` trigger (`internal.budget_items_derive`, definer, no grants), so a client cannot set it and a project with no fringes is exactly as before. Per diems are `kind = 'per_diem'` lines with days, rate, people; the database sets `amount`.

**The alert.** `internal.budget_check_over` and the approval stamp read `amount + fringe_amount`; the alert trigger also fires on `fringe_amount` and the per diem factors. Persona-tested: spend over the base plan is back under once a fringe raises the plan (re-armed), crossing the fringed plan alerts again, a fringe's rate changing re-arms, the approval stamps the fringed total.

**Access.** SELECT `budget.read`; writes `can_shape_project` AND `budget.write` (a designer who shapes the project but cannot write the budget cannot add a fringe). Outsider and anon: nothing.

**App.** Money's planned figures, cash flow, the project overview, portfolio pitch, `ProductionManager`, the approval state, the print and the Excel export use the fringed total; the print and the sheet gain Base and Fringe columns only when a fringe exists. `BudgetLines` has the fringe list and form, a checkbox per fringe on each line, and a per diem form.

**Verified:** migration applies on a fresh local reset; the full persona suite (the one failure, `index-hygiene`, was a missing composite foreign-key index, fixed); `npm run db:drift` no drift; typecheck; eslint on the changed files; `lib` and `components` unit tests; `e2e/budget-fringes.spec.ts`, `budget-excel` and `budget-lines` pass against a production build on the local stack.

**Not built (needs a producer):** preset union and guild tables, rate cards, fringe defaults per craft, fringes on actuals, a fringe on only part of a line.
