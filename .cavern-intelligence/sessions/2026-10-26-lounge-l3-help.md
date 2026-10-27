# Session — 2026-10-26: Lounge L3 — Help (support cases), behind a flag

**Built:** migration `20261027000000_hub_support.sql` — `support_cases`
(subject, the page it came from, status open / waiting / resolved) and
`support_case_messages`, RLS from birth: only the opener and admins read; the
opener inserts a case (status `open` only) and messages; only admins update a
case (the touch trigger keeps opener, subject and page). Two definer triggers:
`support_messages_stamp` sets `from_admin` server-side, `support_messages_route`
moves the case and notifies the other side (opener → `/hub/help/<id>`, admins →
`/admin/support?case=<id>`), so answers reach the phone through Web Push.
`lib/hub/support.ts` (+ tests), `components/hub/SupportThread.tsx`,
`/hub/help`, `/hub/help/[id]`, `/admin/support`; a Help link on `/hub` and
SUPPORT on `/admin`.

**Flag:** `hub_help` — local and preview on, production admins only; its
routes 404 where it's off.

**Verified:** typecheck, lint (0 errors), unit tests, the hub and help persona
tests (23 pass) on the local stack; full suite and build in the PR.
**Not applied** to production or staging — after merge (§3 steps 7–8).

**Left:** a screenshot attachment; email answers (3.15).
