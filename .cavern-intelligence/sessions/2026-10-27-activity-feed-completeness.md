# Session — 2026-10-27: activity feed completeness

Implemented project activity for library additions/uploads, crew invitations
and role changes, locked script revisions, and issued call sheets. Paperwork
events use generic text and are visible only to the author and project shapers;
other new events are visible to project members. Removed BACKLOG 3.5.

**Verified:** typecheck; lint (0 errors, one existing warning in
`lib/hooks/useProjectProgress.ts`); unit tests (1,719 passed); focused
integration tests (33 passed, including owner / contributor / viewer / outsider
activity visibility); local security advisors (no issues); production build.
The local Supabase stack applied the new migration.

**Not run:** the full integration suite and browser e2e suite.
