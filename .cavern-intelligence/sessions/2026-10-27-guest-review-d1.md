# Session — 2026-10-27: guest review, D1 — versions and the client link

**Merged first:** slice A of the link layer (#294; migration applied to
production, then staging, drift green) and the slice D spec (#295). **Owner:**
"merge both, go with your recommendations" — a typed name for guests, the team
confirms a guest's approval, order D1 → D3 → D2.

**Built (D1):** migration `20261030000000_versions_and_reviews.sql` —
`item_versions` (a numbered snapshot of a project script, taken by the database;
immutable once sent; clients hold column grants only), `review_links` (a long
random token only shapers can read; revoke/expiry), `review_comments`, and the
guest's only door: `get_review`, `add_review_comment`, `decide_review`
(SECURITY DEFINER, exact token, anon-callable, caps, notify the team). The team
side is Studio › Share › Review (`ReviewPanel`: save a version, send, make a
link, comment, confirm, revoke); the client side is `/review/[token]`.

**Flag:** `guest_review` — local and preview on, production admins only (the
first feature where someone without an account writes). The `/review` page is not
route-gated, so a link an admin made still opens for the client.

**Tests:** `tests/integration/versions-reviews.test.ts` (15: DB-taken snapshot
and numbering, no forged snapshot / status / decision, draft→sent only, viewers
propose but don't send, Riley and anon read nothing, link tokens readable by
shapers only and only sent versions of the project, guest reads only their
link's versions, unknown/revoked/expired look the same, comment limits and the
200 cap, team comments shown as the team, decisions notify and the team confirms
once, a confirmed decision is closed, no cross-link access, revoke is immediate);
`lib/review/versions.test.ts`.

**Not done:** media versions (need a guest signed-URL route); D3 phases and
gates; D2 lifecycle and layers; per-IP rate limits (an edge layer); verified
guest identity (needs email, 3.15). **Not applied** to production or staging.
