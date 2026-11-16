# 2026-11-15 — Redact error stacks (BACKLOG 3.14)

- `lib/errors/redactStack.ts`: a pure `redactStack` (email, JWT, origin, query string, long hex and base64 runs, paths cut to `/file:line:col`). `toReport` applies it before a report is sent; `/admin/errors` applies it to what it shows (covers rows stored before this change). Unit tests in `redactStack.test.ts`.
- Migration `20261115000600_redact_error_stacks.sql`: `report_client_error` replaced with the same rules and order via `regexp_replace`; signature, `SECURITY DEFINER`, `search_path` and grants unchanged. `supabase/schema.fingerprint` has the new body hash (computed locally from `pg_get_functiondef`'s shape; it reproduced the old hash exactly first). No type change.
- Persona test: `tests/integration/client-errors.test.ts` sends a stack with a path, a query string, a token and an email and reads the stored row redacted.
- **After merge: apply `20261115000600` to production, then staging, then run the drift check.** Not applied from this session.
- Unverified: the SQL regexes were not run (no Docker here; the `database` CI job runs the integration test). JS and PostgreSQL regex engines differ slightly (leftmost-longest), so the CI test is the proof that they agree. Existing rows are not rewritten; `message` is not redacted.
