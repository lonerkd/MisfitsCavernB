# 0001. Postgres RLS is the security boundary

- Status: Accepted
- Date: 2026-07-01

## Context

The suite holds other people's scripts, contracts, money and messages. Early
code trusted the browser with "if the query fails, show nothing", and every
page improvised its own access checks — impossible to audit and easy to get
wrong. A custom API layer was considered and rejected in the 2026-07 core
state work: the tables, policies and triggers already live in Postgres, and
duplicating them in application code creates two truths.

## Decision

Supabase Postgres **Row Level Security is the one enforcement boundary**.
Every table gets RLS from birth; policies read identity through `internal`
schema helpers (`is_project_creator`, `is_project_member`,
`can_access_script`, …) with `auth.uid()` wrapped in scalar subqueries for
InitPlan performance. The client is trusted the way a design tool's client is
trusted — for responsiveness and optimistic UI — and nothing else.

## Consequences

- Every migration ships with its policies, and RLS changes are tested with
  persona-simulated SQL: **Sam** (owner), **Jordan** (crew), **Riley**
  (outsider sees nothing project-scoped).
- Schema changes need `npm run db:types` and a fingerprint update; CI fails
  when production drifts from the migrations.
- Queries that must bypass RLS (server routes, dispatch) use the service-role
  key explicitly, server-side only, and are reviewed for auth and SSRF.
- Cross-cutting features (activity feed, notifications) are wired through
  database triggers so no client can forget them.
