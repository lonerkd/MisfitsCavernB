# Session — 2026-10-27: guest review (D1) applied; one lesson

**Done:** #297 merged; `20261030000000_versions_and_reviews` applied to
production and staging; the drift check is green.

**Learned:** the first drift run failed on two functions because the text I
applied lacked one comment line each, and the check hashes function bodies
exactly. Both were re-applied from the file with `CREATE OR REPLACE`; the next
run was green. Recorded in `PLAYBOOK.md` › Pitfalls.
