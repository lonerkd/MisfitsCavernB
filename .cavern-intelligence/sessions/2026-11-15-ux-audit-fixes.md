# 2026-11-15 — UX audit fixes (BACKLOG 3.46, items 1–5)

- Home footer no longer offers "Forgot password?" to logged-out visitors; `/auth` already has it in sign-in mode.
- The hidden h1 on home dropped "by Misfits Cavern" (the visible subtitle keeps it).
- `MIN_PEOPLE_TOTAL = 25` (`lib/home/ticker.ts`): below it the creators total is left out of the ticker and the stats grid. Unit test.
- `StatsTicker`: the second loop copy is `aria-hidden`. Unit test.
- Auth heading follows the mode (`lib/auth/heading.ts`: Welcome back / Join the cavern / Reset password). Unit test.
- Left (BACKLOG 3.46): items 6 and 7. Not checked by eye in a browser; the footer link removal has no unit test (the home page is not unit-testable cheaply).
