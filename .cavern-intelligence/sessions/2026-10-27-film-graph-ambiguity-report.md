# Session — 2026-10-27: film-graph ambiguous-name report

Added the read-only `film_graph_ambiguous_names` view. It lists same-project
location and character names that differ only by punctuation or whitespace;
the security-invoker view applies the source tables' project RLS and never
merges rows. Replaced the two pending backfill tests and added owner, crew,
outsider and anonymous access assertions. Removed BACKLOG 3.18a.

**Verified:** local migrations applied (including the new view), the focused
integration file passed (9 tests), all 1,711 unit tests passed, typecheck,
generated-type check, schema drift check, and production build passed. Local
database advisors found no issues. `npm run lint` passed with one existing
warning in `lib/hooks/useProjectProgress.ts:74`.
