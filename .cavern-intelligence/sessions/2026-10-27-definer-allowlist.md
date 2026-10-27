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
