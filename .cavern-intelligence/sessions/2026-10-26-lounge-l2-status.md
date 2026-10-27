# Session — 2026-10-26: Lounge L2 — Status (incidents), behind a flag

**Built:** migration `20261026000000_hub_status.sql` — `hub_posts.kind` gains
`incident`, with `severity` (minor/major/critical, required for an incident and
only for one) and `resolved_at`; `hub_incident_updates` (RLS from birth: read
when the caller can read the post — an EXISTS under `hub_posts`' own policy;
admins insert/delete; one SELECT policy); `internal.hub_posts_announce` treats
an incident as important (publishing notifies everyone, resolving doesn't).
`lib/hub/status.ts` (+ tests), `components/hub/IncidentDetail.tsx` (updates
timeline; admins post updates and resolve/reopen), `IncidentBanner.tsx` in the
`(suite)` layout; a Status tab on `/hub`; incident + severity in `/admin/hub`.

**Flag:** `hub_status` — local and preview on, production admins only, so the
owner can try it on live data before it's public (ADR 0007).

**Verified:** see the PR. **Not applied** to production or staging — after
merge (`database-and-security.md` §3 steps 7–8).
