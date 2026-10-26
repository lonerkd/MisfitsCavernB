# Session — 2026-10-25: production caught up with seven merged migrations

**Found:** *Production schema drift* red since 2026-10-24 (the old
`timesheets_guard` drift was fixed earlier; the check passed 10-23). Production
was missing `20261016000000_password_breach_log`, `20261018000000_messages_integrity`,
`20261018000100_reactions_hardening`, `20261019000000_hiring_integrity`,
`20261019000100_message_delete_hardening`, `20261019000200_script_share_slim`,
`20261019000300_audit_resource_id_text`. Production's message read policy still
had the legacy `channel_id` branch (readable by any signed-in user); checked:
0 of 24 messages were such rows, so nothing was exposed.

**Done (owner OK):** applied the seven, in order, with MCP `apply_migration`.
The drift check ran green. Staging already had them (built from `main`).

**Changed:** `STATE.md` (known issue removed, Resume here item 2).
