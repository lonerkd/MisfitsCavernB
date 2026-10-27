# Session — 2026-10-25: Web Push turned on in production

**Done:** generated VAPID keys and a 64-hex dispatch secret; the owner set
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` and
`PUSH_DISPATCH_SECRET` in Vercel (Production only). Inserted the
`internal.push_config` row (the production dispatch route). The owner enabled push
in Settings on an installed iPhone app; a test notification went
database → `pg_net` → `/api/push/dispatch` → device: `{"sent":1}`.

**Learned:** values pasted with stray characters fail as 401 (secret) or a 500
"must be URL safe Base 64" (VAPID keys) — the runtime log names which key.
Vercel applies changed variables only on a new deployment.

**Not done:** staging has no push config (push stays off there).
