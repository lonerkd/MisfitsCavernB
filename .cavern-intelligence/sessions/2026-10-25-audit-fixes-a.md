# Session — 2026-10-25: audit fixes, part A

A read-only global audit (route by route, CI, nightly e2e, production errors,
advisors) found these; this PR fixes the small ones.

**Fixed:**
- **`/auth` and `/settings` threw** `Cannot read properties of undefined (reading
  'length')` (15 in production this week): browser autofill dispatches `keydown`
  with no `key`, and `isTypingKey` (`lib/island/mode.ts`) read `e.key.length`.
  Reproduced with a unit test (`island.test.ts`), fixed; the taskbar's deck-key
  handler hardened the same way.
- **`main` CI red** (`check-sessions`): ten test-only PRs merged without notes —
  this note covers them: #242 (`lib/pwa/splash`), #243 (`lib/formats/script-formats`),
  #244 (`lib/island/useOnSet`), #246 (`lib/scriptos/stash`), #248
  (`lib/util/api-rate-limit`), #249 (`lib/supabase/admin-brief`), #250
  (`lib/scriptos/corpus/metamorphic`), #251 (`lib/island/scale`), #252
  (`lib/supabase/activity`), #255 (`lib/scriptos/context`). Each added unit tests
  only; no app code.
- **Docs that said the opposite of the truth:** `bible/02-account.md` (password
  reset exists; needs SMTP), `bible/10-platform.md` (push is live; staging
  exists), `STATE.md` (advisor counts 11 + 39).

**Started:** the nightly e2e suite by hand (`e2e-scheduled.yml`) for a first baseline.

**Verified:** see the PR.
