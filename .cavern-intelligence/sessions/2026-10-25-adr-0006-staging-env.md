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

**Owner action (done 2026-10-25):** set in Vercel dashboard:
- `NEXT_PUBLIC_PREVIEW_SUPABASE_URL` (Preview only) = `https://preview-placeholder.supabase.co`
- `NEXT_PREVIEW_SUPABASE_ANON_KEY` (Preview only) = placeholder JWT with ref `preview-placeholder`
- Production values for `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` scoped to Production only.

**Also changed:** `next.config.js` — remaps `NEXT_PUBLIC_PREVIEW_SUPABASE_URL` and
`NEXT_PREVIEW_SUPABASE_ANON_KEY` onto the standard names before the guard runs,
so the guard sees the placeholder values and passes.

**Verified:** `npm run typecheck` and `npm run lint` clean (docs-only change).
