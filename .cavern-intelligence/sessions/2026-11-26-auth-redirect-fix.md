# 2026-11-26 — sign-in stranded on /auth: boot's stale-session check could demote a fresh sign-in

Owner report (production): signing in shows "Welcome back." and applies the
saved theme, then nothing — no redirect until a manual refresh.

Trace: the auth page navigated ONLY from a store-status effect, and the one
unconditional demotion left in the system sat upstream of it. `bootOS`
adopts whatever session is stored locally and validates it in the
background; when the auth server rejected that stored session (401/403) it
called `resetOS()` — with no check that the store still held the session it
had adopted. A returning user whose stored session had died is exactly the
person who signs in fresh: if the stale check landed after their
`osAdoptSession`, the store went back to 'anon', the destination's gate
bounced the navigation to /auth, and the effect (already fired, status no
longer 'authed') never fired again. Cookies stayed valid throughout —
hence theme applied, hence refresh fixing it.

Fixes:
1. `lib/os/boot.ts` — the rejection now re-reads the live session and only
   resets when its access token is still the adopted one. A replaced
   session is not boot's to kill. Regression test in `lib/os/boot.test.ts`
   (stale token A rejected after live session moved to token B: stays
   authed); the same-token rejection test still signs out as before.
2. `app/(suite)/auth/page.tsx` — the submit handler navigates directly on
   success via a shared `landingTarget()` (the store is already 'authed'
   when osSignIn/osSignUp return, so the destination gate cannot bounce);
   the status effect remains for landing on /auth already signed in. One
   mechanism failing no longer strands the page.

Not verified here: the live journey itself. `e2e/auth-journey.spec.ts` is
the reproduction (opt-in, E2E_LIVE_AUTH=1) — run it against production or
the local stack before calling this closed; the owner's next fresh
sign-in on production is the other half of the proof.
