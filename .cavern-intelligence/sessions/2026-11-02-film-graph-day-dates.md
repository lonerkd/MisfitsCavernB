# Session — 2026-11-02: a shoot day's date is the day's own (cutover step 4, first slice)

Dates for a day live on `shoot_days.shoot_date` (set on the stripboard and the schedule); a trigger copies one to the day's call sheet if there is a sheet. Readiness read dates only from call sheets, so a day dated on the schedule but with no call sheet yet showed "no date" and "Date day 1" as a to-do. `dateOfDayMap` (`lib/film/dates.ts`) now reads the day first and falls back to its call sheet; Readiness uses it.

**Verified:** 4 unit tests (day alone, sheet fallback, day wins, undated left out); a real browser (`e2e/readiness-day-date.spec.ts`: a scene on day 1, the day dated by `shoot_days` only with no call sheet, Readiness shows the date and no "no date"); **the same spec fails against the old Readiness** (checked by building without the change); typecheck, lint, unit tests. No migration.

**Left (and why):** Today's next shoot day / the owner dashboard (`lib/supabase/today.ts`), On set's picker and `dayConflicts` still take dates from call sheets (they need a sheet's calls anyway; the dashboard should also see a dated day with no sheet: S–M). Reordering or inserting days needs the owner's decision on what a day is (see the audit plan, step 4); not started.
