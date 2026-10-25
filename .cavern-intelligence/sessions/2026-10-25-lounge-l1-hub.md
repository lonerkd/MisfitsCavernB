# Session — 2026-10-25: Lounge L1 — the hub as newsletter

**Built:** migration `20261025000000_hub_posts.sql` — `hub_posts` (kind
update/guide, audience everyone/developers/filmmakers/buyers/investors, title,
markdown body, https cover, important, pinned, `published_at` null = draft) and
`hub_reads`; RLS from birth (one SELECT policy each, `(select auth.uid())`,
admins via `internal.caller_is_admin()`); a touch trigger (author can't be
rewritten) and `internal.hub_posts_announce` (definer, trigger-only): an
important post that becomes published inserts one `notifications` row per
profile (type `hub`) → the existing Web Push path. Fingerprint and types updated.
`lib/hub/posts.ts`, `lib/hub/markdown.ts` (markdown → data → React; no HTML
injection), pages `/hub`, `/hub/[id]`, `/admin/hub`, `components/hub/`.
Navigation: taskbar Hub → `/hub` with an unread pip, the top nav, ⌘K "Go to
Hub", admin links, island routes; `/hub` added to the proxy's protected list.

**Landing:** `/auth`'s default redirect `/projects` → `/hub` (a new account
still goes to `/welcome`); the OAuth callback `/profile` → `/hub`. `/` (the
public landing) and the PWA `start_url` (`/today`) unchanged.
`e2e/auth-journey.spec.ts` accepts `/hub`.

**Verified:** typecheck; lint 0 errors (1 old warning); unit tests 1563;
`tests/integration/hub.test.ts` 10/10 on the local stack; build (one run hit
Next 16.4.0's intermittent `SecurityFatalError`, BACKLOG 3.29; a rerun built);
Playwright against the local stack: sign-in lands on `/hub`, "New" mark,
audience filter, a `<script>` in a body renders as text, opening marks read,
an admin saves a draft. **Not verified:** a push on a real phone for a hub
post; the e2e suite (nightly).

**Not applied** to production or staging — after merge, per
`database-and-security.md` §3 steps 7–8.
