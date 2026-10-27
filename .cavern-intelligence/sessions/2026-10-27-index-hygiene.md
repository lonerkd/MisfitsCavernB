# Index hygiene

Resolved BACKLOG 3.31 / issue #301 with migration `20261031000700_index_hygiene.sql`. Added full indexes for all 16 public foreign keys that lacked them, including five partial or incorrectly ordered cases the advisor did not flag. Removed 22 non-unique indexes superseded by those complete indexes; unique and primary-key indexes were left intact. Added an integration check for full FK coverage and retired indexes.

Verified locally: `npm run db:reset`; focused and full integration tests (2 targeted; 514 passed, 1 expected failure, 2 TODOs); `npm run db:drift -- --update` and `npm run db:drift` (no drift); local performance advisor (0 unindexed FKs); `npm run typecheck`; `npm run lint` (one unrelated existing warning in `lib/hooks/useProjectProgress.ts:74`); `npm run test` (1,711 passed); `npm run build`; and `npm run db:types:check` (no type diff).

Production and staging application remains post-merge, per [the migration workflow](../database-and-security.md#3-database-changes--the-migration-workflow-authoritative).
