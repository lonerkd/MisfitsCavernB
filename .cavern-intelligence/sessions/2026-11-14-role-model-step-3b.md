# Session - 2026-11-14: the role model, step 3b (crew invite accept / decline)

**What was wrong:** an invitation sent with `inviteToCrew()` stayed `pending` forever. Only the project creator could `UPDATE` a `project_crew` row (the "Project creators can update crew" RLS policy), so an invited person had no way to confirm or decline. As a side-effect, `internal.can_access_project` counted any `project_crew` row regardless of `status`, so a pending or declined member could read every non-private project they were ever invited to.

**Built** (migration `20261114161316_crew_invite_response.sql`):

1. `public.respond_to_crew_invite(p_project_id uuid, p_response text)` — a `SECURITY DEFINER` RPC that lets the caller update their own `pending` row to `confirmed` or `declined`, notifies the project owner with the person's name and craft, and writes an audit log entry. Any other person calling it gets "no pending invitation found". On the allowlist in `database-and-security.md` §2.D.

2. `internal.can_access_project` — updated to add `and c.status = 'confirmed'` to the `project_crew` subquery. Pending and declined members no longer read the project.

**UI:** `PendingInviteBanner` on the projects page shows each pending invitation above the board (project title, craft, Accept / Decline buttons). The banner appears as soon as the page loads; on Accept the new project is appended to the board without a full reload; on Decline it disappears. The invite notification's existing link (`/projects`) already points to this banner.

**Client:** `lib/supabase/crew-management.ts` gains `respondToCrewInvite()` and `getMyPendingInvites()`.

**Tests:** persona test `tests/integration/crew-invite-response.test.ts` (8 cases: pending member cannot read before responding; Jordan accepts; Jordan reads after accepting; Jordan cannot respond again; Riley cannot respond to someone else's invite; Jordan declines a second invite; Jordan loses read access after declining; Riley still excluded). Runs against the local stack with `npm run db:reset`.

**Not yet verified:** running the persona test on the local stack (Docker required; run `npm run db:reset` then `npx vitest run -c vitest.integration.config.ts tests/integration/crew-invite-response.test.ts`); the migration on production and staging (after merge, then the drift check).

**Left in BACKLOG 3.50:** step 3c (`production_records` money kinds onto `budget.read`/`budget.write`); steps 4–7 (role-shaped Today, invite sentence, why-denied, per-role browser specs, view as a role, credits per role).
