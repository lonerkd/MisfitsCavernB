# Session - 2026-11-19: continuity extras (BACKLOG 3.18 b)

- **Shoot order beside story order:** every scene in Production › Continuity now says "Shoots day N" (or "Not scheduled") next to its story day and time.
- **Wardrobe and make-up sheet:** a second print button (Print / PDF and CSV, through the print kit) with one table per character in script order: scene, story day, shoot day, and the look noted; a missing look prints as "(no look noted)" and the header counts them. `wardrobeDoc` in `lib/studio/continuity-print.ts`, with unit tests.

**Verified:** typecheck, the print unit tests, and `e2e/continuity.spec.ts` (new case: both buttons and a shoot-day label on all three scenes) on a production build on the local Supabase stack. Not verified: the printed page itself was not looked at; nothing on a phone.

**Left in 3.18 b:** a photo and wardrobe/prop elements on a look (a migration and storage, a persona test).
