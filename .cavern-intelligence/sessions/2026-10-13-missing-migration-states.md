# Session — 2026-10-13: a missing production migration now says so

**Found:** Production › Continuity and "Not a character" call tables and columns that exist in code before the owner pastes the migration. The data layer hid the database's message ("Could not load continuity"), and Continuity showed an empty page with no error at all.

**Changed:** `describeFailure` in `lib/studio/api.ts` recognises a missing table or column (`42P01`, `42703`, `PGRST204`, `PGRST205`, "schema cache") and says "This part of the suite needs a database update that has not been applied yet. Ask the owner to apply it." Every studio save and load that fails this way now shows it (so "Not a character" says it when it can't save). Continuity shows a load-error panel (`role="alert"`) instead of an empty view. Test: `lib/studio/failure.test.ts`.

**Not done:** the Character Bible's list of rejected names still shows nothing when the load fails (it has no error slot); the story-time columns on scenes fail inside the scenes load, which already shows its own error.

**Verified:** `failure.test.ts` 2/2, typecheck, lint (0 errors). **Not verified:** the screens in a browser against a database without the migration; build; CI.
