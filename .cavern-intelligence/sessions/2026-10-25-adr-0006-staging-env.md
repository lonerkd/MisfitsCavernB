# Session — 2026-10-25: ADR 0006 — staging environment for Vercel previews

**Changed:** `adr/0006-staging-environment.md` (new — referenced by
`scripts/preview-env-guard.js` since the guard was written but never created),
`adr/README.md` (index row added).

**Context:** all Vercel preview builds have been failing since the guard was
introduced — `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
were scoped to all Vercel environments including Preview, so the guard blocked
every build. The fix is a two-step owner action in Vercel dashboard:
1. Add two Preview-scoped overrides (placeholder URL + placeholder anon JWT
   whose `ref` is `preview-placeholder`, not the production ref).
2. Remove Preview from the scope of the real production vars.

**Owner action required (Vercel dashboard → Project → Settings → Environment Variables):**
- Add `NEXT_PUBLIC_SUPABASE_URL` for Preview: `https://preview-placeholder.supabase.co`
- Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Preview: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwicmVmIjoicHJldmlldy1wbGFjZWhvbGRlciIsImlhdCI6MTAwMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ.cHJldmlldy1wbGFjZWhvbGRlci1zaWc`
- Find the existing production values for both vars and uncheck "Preview" from their targets.

**Not changed:** no app code, no schema, no tests.

**Verified:** `npm run typecheck` and `npm run lint` clean (docs-only change).
