# Session — 2026-10-27: validation-vs-rls test run and cleared

**Why:** BACKLOG §2 still listed `tests/integration/validation-vs-rls.test.ts` as “written but never run.”

**Ran:** local stack up via `npm run db:start`, then `npm run test:integration -- tests/integration/validation-vs-rls.test.ts`, plus `npm run typecheck` and `npm run lint`.

**Result:** the integration spec passed (7/7), typecheck passed, lint passed with one pre-existing warning in `lib/hooks/useProjectProgress.ts` (`react-hooks/exhaustive-deps`).

**Docs:** removed that verification item from `BACKLOG.md` because the done condition was met.
