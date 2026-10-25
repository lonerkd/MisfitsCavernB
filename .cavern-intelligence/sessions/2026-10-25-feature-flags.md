# Session — 2026-10-25: feature flags (audit plan B5)

**Added:** `lib/flags.ts` (typed registry; `flagEnv`, `flagOn`, `flagForPath`,
`routeGate`) with `lib/flags.test.ts` (every environment × setting, admin-only,
and a stale-flag check: fails on a flag fully on for > 30 days);
`components/Flag.tsx` (`<Flag>`, `useFlag` — asks `getMyAccount` only for an
admin-only flag in production); `proxy.ts` 404s a flagged path where it's off
(JSON 404 for `/api/`) and checks admin (`get_my_account`, as `/admin` does)
only on admin-only flagged paths. ADR 0007; `routing-and-surface.md` §1,
`conventions.md` §9a.

**Flags registered:** `voice_rooms` (on everywhere — registered so the owner
can switch it; nothing hidden yet), `discord_signin_preview` (the Discord
sign-in button and its divider are hidden on previews — Discord isn't set up
for staging). No flag owns routes yet, so no nav/⌘K/island entries change;
the hub (PR #260) will be the first.

**Verified:** typecheck, lint (0 errors), 1559 unit tests, build — see PR.
**Not verified:** a deployed preview showing the Discord button hidden.
