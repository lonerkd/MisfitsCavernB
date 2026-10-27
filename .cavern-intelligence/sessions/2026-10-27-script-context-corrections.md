# Session — 2026-10-27: ScriptOS context and line corrections

**Built:** The editor and Studio now share castings, rejected names, known
locations, and repeated confident cues from the previous draft. Place context
only canonicalizes an already-recognized scene. Human line decisions persist
per script and exact text occurrence, respect Fountain/title-page syntax, and
can be undone in the editor. RLS uses `internal.can_access_script`.

**Verified:** 59 focused ScriptOS tests; all 515 integration tests (including
the owner/crew/outsider/anon cases); all 1,720 unit tests; typecheck; production
build; local schema drift; Supabase advisors (no issues). Lint passed with one
pre-existing warning in `lib/hooks/useProjectProgress.ts`. The integration
suite reports one expected fail and two todos, unrelated to this change. The
migration was applied to the local stack.

**Still open:** The private per-writer memory scope and cross-project behavior
need an owner decision. The generated corpus is not an independent real-script
check; the private corpus needs scripts the owner has the right to use. Context
for other parser callers remains scoped in BACKLOG 3.22. Production and staging
have not received this migration.
