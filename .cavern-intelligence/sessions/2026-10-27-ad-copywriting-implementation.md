# Session — 2026-10-27: advertising and copywriting deliverables

Implemented ad deliverables, the structured copy editor, owner-managed approved
references and brand rules, and guest review rendering under `ad_copywriting`.
The phase engine remains at its existing five phase IDs; client approval is the
gate before production. C4 export remains open in the plan and BACKLOG.

Verified: `npm run typecheck`, `npm run lint`, `npm run test` (1,718 passed),
`npm run build`, `npm run sync-intel`, and the focused 40-test run. Lint reports
one existing warning in `lib/hooks/useProjectProgress.ts`.

Not verified: the migration and persona integration test; starting the local
Supabase stack previously failed while pulling Docker images due to registry
rate limits. No production database was touched.

**Taken over and reviewed (Claude, 2026-10-27; Copilot was out of quota).** Fixed before merging:
the migration set the ad formats' script format to `copy` without allowing it in
`project_formats_script_format_check` (it did not apply); `internal.approval_pending`
ended with `greatest(outstanding, 1)`, so an ad project's gate could never be
passed once every piece was approved (a test fails without the fix); the copy
editor fed the editor's change handler a fake textarea event, which would throw
when the autocomplete tried to place its popup — it now has its own
`handleCopyChange`; the editor page parsed *every* script by its stored format
(a hidden change for podcast and outline scripts) — limited to `copy`, the rest
is BACKLOG 3.35; unlinking a reference was open to any project member — now people
who shape the project. Added tests for that, and for an ad project with no
deliverables. Flag `ad_copywriting` is now on in production. The migration was
renumbered `20261031000800` (the number 000700 went to index hygiene).
