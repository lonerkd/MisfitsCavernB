# Architecture Decision Records

Short records of *why* the suite is built the way it is — the questions a
diligence team, a new contributor, or future-us will ask. The PR bodies and
`.cavern-intelligence/STATE.md` hold the day-to-day history; this folder holds
the decisions that outlive any one of them.

## Format

One file per decision: `NNNN-kebab-case-title.md`, numbered in order, never
renumbered. Use the template below. A decision's `Status` moves forward only
(`Proposed` → `Accepted` → `Superseded by ADR-NNNN`); the file itself is never
rewritten to look different from how it happened.

## The record

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-supabase-rls-security-boundary.md) | Postgres RLS is the security boundary | Accepted |
| [0002](0002-data-access-through-lib.md) | All data access through `lib/`, enforced by lint | Accepted |
| [0003](0003-pwa-before-app-store.md) | Installable PWA first, App Store wrapper later | Accepted |
| [0004](0004-push-dispatch-from-the-database.md) | Web Push dispatched by the database via `pg_net` | Accepted |

## Template

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by ADR-NNNN
- Date: YYYY-MM-DD

## Context

What forces are at play: the problem, the constraints, what was tried.

## Decision

What was decided, in the active voice ("We …").

## Consequences

What this makes easier, what it makes harder, what we give up.
```
