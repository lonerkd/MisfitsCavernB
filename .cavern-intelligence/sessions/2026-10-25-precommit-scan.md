# Session — 2026-10-25: credentials are refused before they're committed

**Why:** the repository is public, and the only secret scan was CI's gitleaks —
after the push (gating design, 2026-10-25).

**Changed:** `scripts/scan-staged.js` (staged added lines: private keys, AWS,
GitHub and live API tokens, Supabase server keys, and any Supabase JWT whose
role isn't `anon`) runs first in `.githooks/pre-commit`; `gitleaks protect
--staged` also runs when installed. Tests in `lib/env/scanStaged.test.ts` (fake
keys built at runtime). `tools-and-access.md` updated.

**Verified:** a staged `service_role` JWT was refused by the hook (exit 1); unit
tests; typecheck, lint, full test suite.
