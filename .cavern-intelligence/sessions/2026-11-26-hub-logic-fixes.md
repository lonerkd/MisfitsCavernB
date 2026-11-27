# Hub logic fixes: one page, four counters, all called the same thing

Owner QA, Nov 26, 2026: the project hub's windows contradicted each other
(Schedule headlined "16 days past the end date" over "No milestones yet"
while the hero showed 2 of 5 milestones done), the brief's facts line was
typeset as a headline, the guide's phase rows snapped shut when pressed,
and the Production Management office clipped its own forms and refused the
owner his own budget. Diagnosis first, then this slice. The root disease on
the hub: four different quantities — format milestone *definitions* (hero),
`timeline_items` rows (Schedule), brief *answers* (brief chips), guide
*steps* — all presented in the same "X/Y" language. This slice disambiguates
and fixes the mechanics; the project brain's B0 one-read remains the full
cure for the shared-name problem.

## Fixes

- **Schedule window** (`DeptWindow.tsx` `TimelinePreview`): the countdown
  reads `projects.end_date`; the list is timeline rows. With an empty
  timeline it no longer headlines the bare past-deadline countdown — it
  says "No schedule dates yet". With a timeline, the countdown speaks as
  before. The empty list now reads "No timeline items yet".
- **Hub stat relabel**: the Schedule window's stat counting
  `counts.timeline` is labelled **Timeline**, not "Milestones" (the hero's
  milestones keep their name — they are the format definitions).
- **Brief tabs** (`BriefPanel.tsx`): each phase tab gains a visible
  "brief" qualifier plus `aria-label`/`title` ("Post-Production brief:
  0 of 4 answered") — the counts are brief answers, not milestones.
- **Brief head**: the `<h2>` is "Project brief" again; the summary string
  ("Drama · Grounded · 14 min · Festivals") renders as a 12px meta line
  under it (`.summary`), and `.title` shrinks to a modest size.
- **Guide phases** (`GuidePanel.tsx`): the React-controlled
  `<details open>` accordion (press → next render snapped it back) is now
  a button-headed accordion driven by `useState` (default open = the
  current phase; pressing the open one closes it). The label ellipsises
  (`min-width: 0`), the count no longer shrinks, and a phase whose steps
  all sit in "This week" renders a one-line note instead of an empty
  list. StepItem's own `<details>` is untouched.
- **Office add-task** (`ProductionManager.tsx`): placeholder shortened to
  "Add a task… (type @ to mention)" — the full hint lives in the field's
  `aria-label` (`label` prop). The 16px phone input floor no longer
  clips it mid-word.
- **Office AddForm**: the text field gets its own row at full width; date
  fields move to a second row, each `flex: 1` with a real visible label
  (Start/End, Deadline) — `type="date"` never showed the placeholder
  labels, and the fixed 110px dates were crushing the text field to
  "Milest…". `onSubmit` value ordering unchanged; Festivals shares the
  new structure.
- **Budget honesty**: `useMyCapabilities` gains an `error` state — a
  failed `my_capabilities` read used to collapse to an empty set, i.e. a
  fake refusal. The Budget panel is now a `BudgetGate`: on error it says
  "Couldn't check who can see the budget just now" with a Retry (remount
  refetch); `NeedsCapability` gains `canAsk` (default true) and the gate
  passes `canAsk={false}` for the project owner, who previewing as crew
  was offered an "Ask the owner" button addressed to himself. No
  capability templates or DB grants changed — the database already
  grants creators everything; both failure modes were client-side.

## Tests

- `DeptWindow.test.tsx` (new): empty timeline never headlines the
  countdown; countdown speaks with a timeline; no-date state; pin that
  the page stat is labelled Timeline.
- `useMyCapabilities.test.tsx` (new): success answers with `error`
  false; a failed read reports `error` true.
- `NeedsCapability.test.tsx`: `canAsk={false}` keeps the explanation,
  drops the button.
- `brief-panel.test.ts`, `guide-accordion.test.ts` (new): source pins
  for the deliberate pattern changes (heading/meta demotion, tab
  qualifier, button accordion, empty-phase note).

## Verified

Locally: targeted suites (hub, brief, guides, roles — 127 tests) plus
the other `useMyCapabilities` consumer suites (87 tests) all pass;
eslint clean on every touched file; `npx tsc --noEmit` clean;
`npm run bible` — inventory unchanged (no routes/tables/functions/e2e
specs moved). Not verified: the rendered pages on a real phone — the
owner's eye after deploy is the check for the visual fixes, and the
guide accordion's press feel.
