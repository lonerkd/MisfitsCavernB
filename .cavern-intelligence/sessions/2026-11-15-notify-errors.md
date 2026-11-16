# 2026-11-15 — notify() errors reach the person (BACKLOG 3.23)

- `notify()` already returned an error message; most callers dropped it, so a failed notice was silent. Every caller now checks it and toasts "Saved, but X wasn't notified: <reason>"; the primary action still counts as done.
- Changed: job application from the board (`app/(suite)/jobs/page.tsx`) and from the posting (`jobs/[id]/page.tsx`); task assignment (`ProductionManager`); Lounge thread reply, direct message and @mentions (`useLounge`, mentions are awaited together and one toast names who failed).
- Lib code with no UI: `setCrewCraft` and `updateCrewMemberRole` (`lib/supabase/crew-management.ts`) take an optional `onNotifyError(reason)` callback instead of dropping the error; both craft callers (`CrewView`, `ProductionManager`) pass a toast. `updateCrewMemberRole` has no UI caller today.
- Already correct: the announcement box and `ChangeImpactPanel`. `notify` itself is unchanged.
- Tests: `app/(suite)/jobs/page.test.tsx`, `app/(suite)/jobs/[id]/page.test.tsx`, and two new cases in `lib/supabase/crew-management.test.ts`.
- Not covered by a test: the Lounge, task-assignment and craft toasts (those hooks and panels are not cheap to mount). Not checked by eye in a browser.
