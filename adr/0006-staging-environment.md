# 0006. Staging environment: preview builds use placeholder Supabase keys

- Status: Accepted
- Date: 2026-10-25

## Context

Vercel deploys a preview build for every PR. The production Supabase project
(`fxsryglwpwcqkfjljbrm`) holds real user data. Pointing preview builds at the
same project creates three risks:

1. **Data corruption** — a preview running migrations or edge-function code
   against production while the PR is still under review.
2. **Key exposure** — preview URLs are semi-public; the production anon key
   would be baked into every preview's bundle.
3. **False test results** — tests or manual review on a preview that reads live
   data conflate preview and production behaviour.

`scripts/preview-env-guard.js` (required from `next.config.js`) detects when
`VERCEL_ENV=preview` and any of `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` or
`DRIFT_TARGET_DB_URL` reference the production project, and refuses to build.

## Decision

We use **two-level placeholder approach** until a dedicated staging project
exists:

### Immediate (in place 2026-10-25)

The `preview` target in Vercel's environment variables carries two
preview-specific vars, and `next.config.js` remaps them onto the names the
guard and the Supabase client expect before the guard runs:

| Vercel var (Preview scope) | Remapped to at build time |
|---|---|
| `NEXT_PUBLIC_PREVIEW_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` |
| `NEXT_PREVIEW_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

Both hold placeholder values (a URL that does not contain the production ref
and a JWT whose `ref` claim is `preview-placeholder`). The production values
for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` remain in
Vercel scoped to **Production** only.

This allows preview builds to compile and render; the Supabase client
initialises against a non-existent host and all data reads fail silently with
the "Missing or placeholder Supabase environment" warning already in
`lib/supabase/client.ts`. Preview deploys are usable for visual review of UI
changes, not for data-dependent flows.

### Target (when a staging project exists)

Replace the placeholder values with real keys from a dedicated staging Supabase
project. That project runs the same schema (applied from the same migrations),
holds only synthetic data, and is reset on demand. At that point PR previews
are fully functional and the guard becomes a pure safety net.

## Consequences

**Easier:** every PR gets a Vercel preview; the preview URL works for visual
review; the guard catches any accidental re-introduction of production keys in
the Preview scope.

**Harder:** data-dependent flows (login, project hub, the editor, the Lounge)
cannot be tested against a preview URL until the staging project exists. The
reviewer must use the local stack or a `claude/*` branch on the production
deployment for those flows.

**Given up:** nothing. The previous state (all previews failing with the guard
error) was worse than a preview that renders but shows no data.
