# Session — 2026-10-25: a staging Supabase project for Vercel previews

**Made:** Supabase project `cavern-staging` (the owner's
Supabase organisation). All 64 migrations applied from `main` (baseline in two
parts; each file's MD5 matched the repo). 70 public tables, RLS on every one,
65 rows in `schema_migrations`. Empty: no users, no sample data.

**Owner (done):** the Preview variables `NEXT_PUBLIC_PREVIEW_SUPABASE_URL` and
`NEXT_PREVIEW_SUPABASE_ANON_KEY` in Vercel now hold staging's URL and anon key.

**Changed:** `adr/0006-staging-environment.md` (the target is in place),
`database-and-security.md` §3 step 8 (each merged migration also goes to
staging).

**Owner, still open:** in staging's Auth › URL Configuration, allow the preview
URLs (the team's `*.vercel.app` preview pattern); Discord sign-in on
staging needs its own provider setup.
