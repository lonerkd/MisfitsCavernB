# Session — 2026-11-15: a branded PDF through the print kit (BACKLOG 3.45)

**Found:** `projects` has `accent_color` but no logo or cover column (`cover_url` exists only on portfolio pieces), and every print tool already passes `accent` to the kit, so the headings and the header rule were already in the project colour. What was missing: the table rules and a logo slot.

**Changed (the kit only, `lib/print/kit.ts`; no tool edited):** a project accent now also colours the table header rule and the totals rule (`--rulehead`); a new optional `PrintDoc.logo` (https only) shows small (30 pt high) at the top left beside the kind and title. With no accent (or the house one) and no logo the output is byte-identical to before (snapshot in `lib/print/__snapshots__`, taken from the old kit before the change). No migration, no new column.

**Verified:** `lib/print/kit-branding.test.ts` (unchanged snapshot, accent on the rules, invalid accent ignored, logo placement, non-https logos refused). Typecheck, lint (0 errors), tests, build, bible, sync-intel: see PR.

**Not done:** no project logo field exists, so no tool passes `logo` yet. Logo needs a field (a `projects.logo_url` column with upload in project settings, migration and persona test, then each tool passes `project.logo_url`); not looked at on a real printed page.
