# Session — 2026-10-18: the call sheet page times out instead of hanging

**Found:** `/call/[id]` waited on `studio.getCallSheetView` with no limit — a hung request left the skeleton up for good. `withTimeout` (`lib/supabase/withTimeout.ts`) never cleared its timer, so every fast call left a pending timeout behind it.

**Changed:** `withTimeout` starts its timer before the race and clears it when either side settles. `app/(suite)/call/[id]/page.tsx` wraps the fetch in it (15 s), falling through to the existing "Couldn't load the call sheet" state. New `lib/supabase/withTimeout.test.ts` (fake timers: resolve, reject, time-out, not before time, no timer left behind).

**Not verified:** typecheck, lint, the unit test and the build — this worktree had no `node_modules` and installing or running node needed an approval the session couldn't get. Run `npm ci && npx vitest run lib/supabase/withTimeout.test.ts && npm run typecheck && npm run lint` before merging.
