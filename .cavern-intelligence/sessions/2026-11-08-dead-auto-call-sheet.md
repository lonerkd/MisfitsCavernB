# Session — 2026-11-08: the unwired call-sheet helper was a duplicate

BACKLOG 3.38 (3) said `lib/studio/auto-call-sheet.ts` was tested but not wired into the seed flow. The seed flow exists: `DayEditor.autoFill` in `CallSheetsPanel` (the "Seed from the schedule" button) fills the location and the day's scene list from the panel's own `dayFacts`. The helper took a stripboard `BoardDay`, a shape the panel never has, and nothing imported it, so it is deleted with its test. Possible follow-up (S): also create the day's cast calls when seeding.
