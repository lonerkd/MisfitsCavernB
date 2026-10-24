# Session — 2026-10-18: "Export all matches" on the audit log

**Changed:** `/admin/audit-logs` has two buttons: **Export page** (the rows shown) and **Export all matches** — every log the action filter and the search match, across all pages. `lib/audit/export.ts` `fetchAllAuditLogs(client, filters, batch)`: the filters run in the database (action `eq`; search as a literal `ilike` on the action and resource id, plus the username through a `profiles!inner` join, merged and de-duplicated by id); each query is read in batches of 1000, ordered by time then id, until a batch comes back empty (so a server row cap can't end it early). Runs as the signed-in admin; RLS ("Admins can view audit logs") is what scopes it. The CSV writer now doubles quotes (JSON details used to break the file) and defuses cells starting `=`, `+`, `@` or `-x`; times are ISO UTC. Found and fixed: `getAuditLogs` never asked for a count, so the pager never showed — it now asks (`count: 'exact'`).

**Tests:** `lib/audit/export.test.ts` (pattern escaping, CSV); `tests/integration/audit-export.test.ts` — Sam (admin) gets every match across batches of 2–3, by resource id, by username, with the action filter, a gone account named; a `%` in the search is literal; Jordan and Riley (members) and anon get nothing.

**Verified:** nothing run — this session could not install dependencies (`npm ci` needs approval here) and Docker was not running. **To run before merging:** `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and `npm run test:integration` against the local stack.

**Open:** the on-screen search still narrows only the loaded page (BACKLOG 3.14).
