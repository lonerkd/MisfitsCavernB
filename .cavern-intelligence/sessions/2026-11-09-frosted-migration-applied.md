# Session — 2026-11-09: the frosted-mode migration applied, and the drift check run

`20261109000000_ui_prefs_frosted.sql` (PR #529) applied to production, then staging (the file's SQL as `apply_migration`, name `ui_prefs_frosted`). Read back on both: the `set_my_ui_prefs` body hash is identical (`c1fa628a…`, the line in `supabase/schema.fingerprint`), it is still `SECURITY DEFINER`, and the grants are unchanged (`authenticated, postgres, service_role`; no anonymous access).

**Drift check, production, 2026-11-09: green.** The whole `supabase/fingerprint.sql` ran through the database tool with its last select replaced by a count and an md5 of the sorted lines: 2,640 lines, hash `65af1a7f…`, equal to the same figures computed from the committed snapshot. (The last full check was 2026-11-07.) Staging got the function-body comparison only, not the whole fingerprint.

STATE.md's handoff now says so.
