# Session — 2026-10-27: festivals that can't break the panel, and off Next 16.4.2

Two of the cheap items the backlog had queued, neither needing the owner or the
database.

**Festivals (`lib/supabase/project-hub.ts`).** `projects.festival_submissions`
is a jsonb list with no constraint, and `getProductionData` cast it straight to
`FestivalRow[]`; the production manager then read `f.status` / `f.id` on whatever
was there, so one `null`, string or object without a status broke the whole
panel. New `festivalRows()` keeps only entries the panel can draw — non-empty
string `id` and `name`, a status from `planned | submitted | accepted |
rejected` — and copies `deadline` / `notes` only when they are strings. The
overview's counters keep their lenient reading (a bare `{status}` still counts;
that is how `get_project_progress` counts). Tests in `project-hub.test.ts` cover
a mixed list and a column that isn't a list. Closes BACKLOG 3.24.

**Next.js 16.4.2 → 16.4.3** (and `eslint-config-next` with it, lockfile
included). The build no longer prints the "affected by a known security
vulnerability" warning: `grep -ci vulnerab` over the build log is 0. Build green
(`EXIT:0`), lint clean, the full unit suite green. Closes BACKLOG 3.29.

**Verified:** `npx tsc --noEmit` clean; `npx eslint` clean; `npm run lint`
0 errors (1 pre-existing warning elsewhere); `npx vitest run` — 174 files /
1693 tests, 1 skipped; `npm run build` exit 0 with no vulnerability warning.

**Not verified:** a Vercel preview on 16.4.3 (needs the PR to build there), and
the production manager on a project whose festival column is actually malformed
(the unit test is the proof today).
