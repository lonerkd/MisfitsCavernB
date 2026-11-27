# 2026-11-26 — Hub: the office section (the admin stack no longer opens the page)

The owner sent a phone screenshot of a project hub with the whole first
section circled: the visibility picker, the View-as switch, the logo link
row and the announcement composer all sat above the project's phase card —
"I just hate the look of this as the first whole section of the page."

- The hub now opens on the project itself: title, logline, then the phase
  panel, brief, guide and the department grid, as before but uninterrupted.
- The owner's controls moved into one grouped **Project office** section at
  the foot of the hub, above ProductionManager: visibility (extracted from
  HubTopBar into `components/projects/hub/VisibilityPicker.tsx`, styles
  unchanged), View as, Logo link, and Tell the team.
- `HubTopBar` is status only now (online count, task tally); on a phone,
  where both chips are hidden, the strip is just breathing room above the
  title. Its tests were re-pointed at the new contract, and the visibility
  tests moved with the picker into `VisibilityPicker.test.tsx`.

Verified locally: bible regenerated, typecheck, the two hub test files,
eslint on the touched files. The visual proof is the owner's phone after
deploy.
