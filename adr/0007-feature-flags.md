# 0007. Feature flags: a typed registry in code

- Status: Accepted
- Date: 2026-10-25

## Context

Previews now run on a staging project (ADR 0006), so unfinished work can be
tried on real deploys. It still must not reach production users until it's
ready (RULES: no half-built UI). The suite had no way to say "on in preview,
off in production", or "admins only in production".

## Decision

We keep feature flags in `lib/flags.ts`: a typed registry, one entry per
unfinished feature, saying whether it's on locally, on previews, and in
production (`off`, `admins` or `on`), with the path prefixes it owns. The
proxy 404s a flagged path where it's off (and checks admin only on paths
whose flag is admin-only); `<Flag>` / `useFlag` hide its entry points. The
schema is the same everywhere — migrations apply to every environment, RLS
guards the tables. A flag is deleted once its feature is fully on; a test
fails on any flag fully on for more than 30 days.

Rejected for now: a `feature_flags` table editable from `/admin` (flips without
a deploy, but another RLS surface and not readable before render — worth it
later for percentage rollouts), and Vercel Flags / Edge Config (an outside
service and cost at this size).

## Consequences

Easier: merge unfinished work to `main` behind a flag; try it on previews and
(admins) in production. Harder: changing a flag needs a deploy. Given up:
switching a feature per user without code.
