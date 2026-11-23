# 2026-11-22 — e2e: the last hand-rolled setup moves to the shared stack (BACKLOG 3.37)

- `admin-actions` and `admin-support-analytics` still built their own anon client; they take `stack.anonClient()` now.
- `password-recovery` made a real account through the sign-up form at `@example.com` and left it behind. It now uses `stack.qaIdentity('recover')` (a QA-marked `@journey.test` address and `qa…` username) and `stack.adoptSignup(email)`, which flags it sample on staging and deletes it at teardown even if the spec fails. It skips unless the stack is on.
- `scripts/e2e-setup-guard.test.mjs` also forbids `auth.admin.createUser` and `createClient(` in specs, and a `createUser` email that is not `@journey.test`. `auth-journey.spec.ts` (opt-in, may target production) is the one named exception.
- Not done (3.37): run a migrated spec against staging; a nightly staging sweep of `qa.*@journey.test` (a new workflow; the budget says remove one first); delete production's throwaway accounts (owner, BACKLOG §1).
- Verified: guard test 7/7, typecheck (app and e2e), eslint on e2e and scripts; admin-actions and admin-support-analytics e2e 7/7 on a production build and the local stack. password-recovery skips without the local mail catcher (not running), so `adoptSignup` itself was not run.
