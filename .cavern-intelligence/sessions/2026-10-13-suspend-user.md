# Session — 2026-10-13: suspending an account (owner approved)

An admin can suspend a person from `/admin/users` (confirmed): they cannot sign in or refresh a session, their sessions are ended, nothing of theirs is deleted, and the admin can lift it. Not yourself, not another admin (remove admin rights first). Audit-logged. A suspended person who tries to sign in reads **"This account has been suspended. If you think that is a mistake, message @lonerkid on Instagram."**

- **How:** `admin_set_suspended(user, suspended)` (definer, admin-gated — on the allowlist) sets the auth service's own ban (`auth.users.banned_until`), deletes their sessions and refresh tokens, sets `profiles.suspended_at` (not a public column; `admin_list_users` returns `suspended`). **Found by testing:** my first version set `banned_until = 'infinity'`, which the auth service cannot parse — sign-in failed with "Database error querying schema", only by accident. It is now 100 years out (what the auth service itself does), and the persona test asserts the service says "banned".
- **Limit, said plainly:** an access token already issued keeps working until it expires (at most an hour); it cannot be refreshed.
- **Schema** `20261013040000_suspend_user.sql`; persona test `suspend-user.test.ts` (7: member and anon refused, not self, not another admin, a missing user, sign-in and refresh stop, listed and recorded, not public, lifting restores). Full integration suite green; snapshot and types regenerated. `personas.ts` now exports `PASSWORD`.
- **App:** Suspend / Lift buttons and a "Suspended" tag on `/admin/users` (no button on admins); the sign-in page's message (`lib/auth/errors.ts`, tested); `osSignIn` keeps the service's error `code`. `suspend-user` e2e: the admin suspends, the member sees the message and stays out, lifting lets them in.

**Owner action:** apply `20261013040000_suspend_user.sql` to production after `20261013030000` (STATE lists the order), then the drift workflow.

**Verified:** typecheck, eslint, unit, integration, `suspend-user` + auth e2e on a real build. **Not verified:** CI (billing); production.
