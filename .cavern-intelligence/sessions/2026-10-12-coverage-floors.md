# Session — 2026-10-12: coverage floors raised

Measured `lib/` coverage is 58.5 / 57.9 / 59.3 / 58.5 (statements / branches / functions / lines) after the deep-brain tests, well over the old 50 / 50 / 52 / 50 floors. The floors in `vitest.config.ts` are now 56 / 55 / 57 / 56 — a little under the measure so noise does not fail a PR, and they only go up. This closes the 3.17 follow-up in STATE ("raise the floors back"): the `lib/supabase/*` modules stay covered by the persona integration tests, not unit tests with a fake client.

**Verified:** `vitest run --coverage` passes at the new floors (921 tests).
