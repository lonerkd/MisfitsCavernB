# 0004. Web Push dispatched by the database via `pg_net`

- Status: Accepted
- Date: 2026-10-08

## Context

A notification row can be written from anywhere — a trigger, an RPC, a server
route — and the push to the person's phone must follow *that* write, never be
forgotten by whichever code path produced it. Options: an application-side
sender (every writer remembers to call it), a queue worker (new infrastructure),
or a database trigger. The database already has the trigger machinery and the
`pg_net` extension; the actual HTTP send needs Node's `web-push` (VAPID
signing), which does not run inside Postgres.

## Decision

The database owns the decision, the network call owns the delivery:

- A trigger after insert on `notifications` calls
  `internal.push_notification`, which — only when configured and only when the
  person has a saved device — `net.http_post`s `{notification_id}` to
  `/api/push/dispatch`.
- `internal.push_config` holds the dispatch URL and a shared secret **per
  environment**; an empty row means push is off (no configuration, no
  traffic).
- `/api/push/dispatch` authenticates the secret (timing-safe compare), checks
  the person's `notification_prefs` for that notification kind, sends through
  `web-push`/VAPID, and forgets devices the push service has dropped
  (404/410). A failure never loses the notification — it is already in the
  table, in-app.

## Consequences

- Push follows every notification automatically, whoever writes it —
  triggers, RPCs, server routes.
- One Node route reuses the existing Vercel deploy; no Edge Function runtime
  or separate secret store.
- Environments are configured by a row + env vars, not by code — activating
  push is an owner step, and forgetting it fails safe (off).
- `pg_net` is a hard dependency for delivery; its absence degrades to
  in-app-only notifications, which is the product's baseline anyway.
