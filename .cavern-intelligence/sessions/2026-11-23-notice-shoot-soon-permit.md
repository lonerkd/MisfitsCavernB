# Session - 2026-11-23: the first context notification, a shoot soon with an open permit (BACKLOG 3.53, slice 3a)

The notification system had timing and honesty but nothing that used what only this suite knows. A daily worker (`internal.notify_shoot_soon_permits`, pg_cron at 14:00 UTC, migration `20261123000300`) finds shoot days dated in the next three days, the scenes on them and their locations, and for each location whose permit is still `needed` or `applied` tells the owner and the project's confirmed leads, once: "Permit still open for DOCK" / "<project>: Day 1 shoots at DOCK on 2026-12-03, and its permit is still needed." It names the place, the day and the date. `public.context_notices` holds one row per (project, kind, key); the key is the location and the date, so a moved shoot day is a new fact and a repeat run says nothing new. RLS on, no policies, no grants; the worker is a no-grant definer function (allowlist updated). One project failing does not stop the run. The kind is not on the per-kind switches yet (slice 5); the push sender still holds it for quiet hours.

**Verified:** typecheck, lint, the build. The persona test `notice-shoot-soon.test.ts` (owner told once, by place and date; a granted permit and a far day are not; a repeat is silent; a contributor and an outsider are not told; a moved day is new and a lead is told; the log is closed to the API) and the migration run in the `database` check; production and staging need the migration applied by hand after merge, then the drift check. The text on a real phone is not looked at.

## Fix, 2026-11-24: the test wrote scenes against the wrong model

The integration test failed from its first CI run: the worker sent nothing.
Diagnosis (via a temporary stage-count test in CI, since removed): the
fixtures' places, days and scenes all inserted cleanly and the shoot day
sat inside the window, but the worker's join produced zero rows. The test
wrote scenes with `location_id` / `shoot_day_id` set directly; the
`scenes_link_place_and_day` trigger (film graph, 2026-10-10) derives both
columns on insert from the scene's `location` text and `shoot_day` number,
and with the location text empty it set `location_id` to null — silently
unlinking every fixture scene from its place. The worker and the migration
were never at fault. The test now writes scenes the way the app does
(location text + day number) and lets the trigger link them; all
assertions are unchanged.
