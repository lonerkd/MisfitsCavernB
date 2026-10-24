# Session — 2026-10-18: the crew's call sheet says when it can't load, and admins see it

**Found:** `/call/[id]` only `console.error`'d a failed load — nobody but the browser console knew. A missing sheet showed "not found" with no record anywhere, so a notification pointing at a deleted sheet was invisible to admins. Changing sheet (or reloading data) kept the previous sheet's data on screen while loading.

**Changed:** `lib/studio/call-sheet-load.ts` — `loadCallSheet` turns the fetch into ready / missing / error and never rejects (a sheet whose production can't be read is "missing" too); `callSheetNotice` says what to toast and what to log. The page toasts (info for missing, error for a failure), sends each to Admin › Errors through `reportError` (digests `call-sheet:missing`, `call-sheet:load-failed`; the per-visit gate and the RPC's rate limit stop floods), shows the failure's reason with "Try again", and keys each load by sheet + attempt so stale data never shows. Bible 05 lists the states. `e2e/call-sheets.spec.ts` checks Riley sees the toast.

**Verified:** typecheck, lint (0 problems), 1013 unit tests (6 new in `call-sheet-load.test.ts`), production build. **Not verified:** the e2e spec (no local stack started this session) and the Admin › Errors rows against a database.
