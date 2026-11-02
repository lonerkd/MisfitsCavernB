# Session — 2026-11-02: the owner dashboard sees a day dated on the schedule

Today's "Your projects" read the next shoot day only from call sheets, so a day dated on the schedule (stripboard or Schedule view) but without a call sheet yet was invisible there, and the "call sheet not issued" flag that exists to nudge the owner could not fire for it. `withScheduledDays` (`lib/today/owner.ts`) adds each dated `shoot_days` row that has no sheet (as not issued); a day with a sheet keeps the sheet, which knows whether it was issued. `getOwnerData` reads the day rows beside the sheets.

**Verified:** 4 unit tests (a dated day without a sheet; a day with a sheet keeps the sheet; undated days and other projects; the owner row shows the next day and flags it within the week); a real browser (`e2e/today-owner.spec.ts`: a second production with a day dated by `shoot_days` only shows "Day 1 · … · call sheet not issued"), **which fails against the old data layer**; typecheck, lint, unit tests. No migration.

**Left:** the crew's "next days on set" and On set's picker still need a call sheet (a crew member's call lives on one); `dayConflicts`.
