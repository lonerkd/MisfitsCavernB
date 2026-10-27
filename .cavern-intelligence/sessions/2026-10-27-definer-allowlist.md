# Session — 2026-10-27: definer allowlist reconciliation

Reconciled `.cavern-intelligence/database-and-security.md` §2.D with the
production security-advisor counts recorded in BACKLOG on 2026-10-25 (11
anon-callable, 39 authenticated-callable). The raw advisor listing is not in
this clone; verified the counts against the current schema snapshot and
migrations. Split the Lounge edit, pin and reaction RPCs into separate
entries with their exact gates. The current list also includes the three
guest-review RPCs, two case-study RPCs and `advance_phase`, added after that
advisor run. Removed completed BACKLOG 3.30.

Verification: compared the §2.D inventory with `supabase/schema.fingerprint`
and inspected the corresponding migration definitions. No database or
application behavior changed.

**Verified against the live advisor (Claude, taking over, 2026-10-27):** the production security advisor lists 14 anon-callable and 45 signed-in-callable definer functions; all 45 names appear in §2.D. The 2026-10-25 counts (11 / 39) plus the six later additions reconcile exactly. Replaced the counts with the live ones.
