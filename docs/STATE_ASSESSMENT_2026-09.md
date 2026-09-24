# State Assessment — September 2026

Tested commit: `b39f241` (main, same SHA as the current Vercel production deploy
of `misfits-cavern-b`). Method: static gates, a production build pointed at the
live Supabase project, the existing Playwright suite, a crawler that visits
every route as an anonymous user and as a fresh account and clicks every
non-destructive control, targeted user journeys, and direct DB/RLS/advisor
inspection.

## Verdict

**The foundation is solid. The problem is the space between features.** It
builds, it type-checks, it lints clean, and all 118 unit tests pass. Route
gating is correct and no page crashes except one. But a new user who signs up
and tries the core loop (create a project, write a scene) can end up with
nothing saved and no error shown. That comes from one systemic bug (#1 below).
The newest feature (visibility/sharing) shipped to production without its
database migration.

| Area | State |
|---|---|
| `tsc --noEmit` / `lint` / `vitest` (118) / `next build` | ✅ all green |
| Middleware gating (12 protected routes → `/auth?redirect=`) | ✅ correct |
| Public routes, 404, error boundary | ✅ except `/showcase` |
| Signup → lands in app | ⚠️ works, but took ~29 s on a slow link (30 s timeout) |
| Create project / write in editor right after signup | ❌ can silently fail (see #1, #2) |
| Visibility / share links | ❌ code in prod, migration not applied |
| `/showcase` | ❌ crashes on every load |
| Studio / Jobs / Crew / Settings / Lounge / Soundtrack | ✅ render, no crashes |
| DB: 50 tables, all RLS-enabled; all 41 code-referenced tables + 4 RPCs exist | ✅ |
| E2E in CI | ⚠️ only 2 of 5 spec files run |

## Bugs, ranked

### P0 / P1

1. **Identity race: signed-in users treated as signed out.** Pages read the
   user *once* on mount (`awaitOSUser()` behind a 12 s `withTimeout`, or a bare
   `getSession()`), and they never subscribe to later changes. Boot resolves
   identity serially (auth → profile → projects → sync) before the store leaves
   `resolving`. When that is slow, the page settles as "no user" and stays that
   way until a hard reload. Reproduced: straight after signup, `/projects` →
   *New Project* → toast "Sign in to create projects" (`app/projects/page.tsx:390`).
   The same pattern appears in the editor init (`app/editor/page.tsx:237`), the
   portfolio distribution loader (`app/portfolio/page.tsx:281`, which returns
   without clearing loading), and the profile page, which bypasses the OS store
   entirely (`app/profile/page.tsx:39`).
2. **Editor silently discards writing.** On a first visit with no scripts, the
   editor calls `createNewScript()` once. If identity isn't ready, it returns
   null and `currentScript` stays null. The autosave effect then bails
   (`if (!currentScript) return;`) and nothing is shown to the user. Confirmed
   in the DB: the journey account typed a scene and has **0 scripts**. The only
   copy is the localStorage crash backup.
3. **`/showcase` crashes on every load** (anonymous and signed in):
   `Cannot read properties of undefined (reading 'ReactCurrentBatchConfig')`.
   Next 15's App Router runs on its bundled React 19. `@react-three/fiber@8`
   ships a React 18 reconciler, and React 19 removed that internal. The only
   consumer is `components/3D/OrbitGallery.tsx`. Fix: upgrade to
   `@react-three/fiber@9` + `drei@10`, or drop the 3D gallery (three, fiber and
   drei are a heavy dependency set for one page).
4. **Visibility feature is live without its migration.** Production `projects`
   has no `visibility`, `share_token`, `is_public` or `cover_url` columns.
   Effects: the hub's visibility selector errors on change, and
   `/shared/[token]` always says not found (it also selects `cover_url`, which
   doesn't exist). The migration itself would **fail** as written
   (`UPDATE projects SET is_public = …` on a missing column). Once fixed and
   applied, its policy `"Link-shared projects readable by anyone with the link"
   USING (visibility = 'link')` has **no token check**, so an anonymous
   `select * from projects` would list every link-shared project and its
   `share_token`. That's a Riley P0. The token must be checked in RLS (for
   example, via a `SECURITY DEFINER` lookup-by-token RPC), not only in the URL.

### P2

5. `spotify_connections … .single()` returns **406 on every page load** for
   every user without Spotify linked. Use `.maybeSingle()`.
6. Network failures show "Something went wrong" instead of "Unable to connect":
   `app/auth/page.tsx` checks for `'fetch failed'` (Node's wording), but
   browsers say `'Failed to fetch'`.
7. **Schema drift.** `supabase-schema.sql` declares `projects.is_public` and
   `cover_url`, but live has neither. Migrations are loose root `.sql` files
   (44 applied live, with no `supabase/migrations/` directory mapping to them).
8. **Security advisors:** `has_discord_webhook` is a `SECURITY DEFINER` RPC
   executable by `anon`. `can_manage_channel`, `can_post_channel`,
   `toggle_message_reaction` and `has_discord_webhook` are executable by
   `authenticated`. Leaked-password protection is off (the app does its own
   HIBP check client-side).
9. **Storage:** all 4 buckets are public, so project assets are world-readable
   by URL. `assets` and `sfx-library` (hyphenated) are orphaned. The code uses
   only `studio-assets` and `sfx_library`.
10. **E2E coverage:** CI runs only `home-page-crash` + `auth-validation`.
    `route-smoke` would have caught #3 but isn't in CI, and its `/settings`
    assertion is stale (it expects settings text on an unauthenticated visit,
    which now redirects to `/auth`).

## Not bugs (environment noise, ruled out)

- Signup "Something went wrong", `ERR_CERT_AUTHORITY_INVALID`,
  `ERR_TOO_MANY_RETRIES` and the blocked realtime WebSocket all came from the
  test sandbox's TLS proxy. A direct `auth.signUp` against the project returns
  a session immediately, and email confirmation is off.
- `/admin/*` redirecting a normal user to `/` is the intended behaviour.
- Vercel reports no server-side runtime errors in the last 7 days.

## Test accounts created

Three `e2e.qa.*@example.com` accounts were created on the live project during
this run. They now appear in the public crew directory. Delete them when
convenient.

## Suggested order

1. Make pages subscribe to the OS session (a `useOSUser()` hook that re-renders
   on `authed`) instead of reading it once. This fixes #1 and #2 together. Add a
   visible "not saved" state to the editor.
2. Fix the visibility migration (`is_public`, token-checked link policy,
   `cover_url`), then apply it.
3. Fix `/showcase` (upgrade R3F or remove the 3D gallery), and add
   `route-smoke` to CI.
4. P2 cleanups: `maybeSingle`, the error string, advisors, bucket privacy,
   schema file.
