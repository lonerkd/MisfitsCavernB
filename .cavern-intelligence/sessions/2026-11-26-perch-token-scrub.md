# 2026-11-26 — The .perch CourtListener token scrubbed from the repo

**What changed:** `.perch/mcp.json` carried a live-looking CourtListener
token (the same 40-character value under both `COURTLISTENER_API_KEY` and
`COURTLISTENER_TOKEN`), committed with PR #545 and public since. Both
values are now the placeholder `REPLACE_WITH_YOUR_OWN_COURTLISTENER_TOKEN`.
Nothing else in the file changed.

**Why not a rotation:** the token was chased down on 2026-11-26 and it is
not the owner's. CourtListener's own password-reset reply confirms no
account exists under the owner's email, and the connector is Perch's
built-in — Perch writes that file itself, so the token is Perch's bundled
one. There is no owner account to rotate it in. Rotating the bundled
token is Perch's call (their support); what the repo controls is that no
live token sits in a public file, which this PR closes.

**Going forward:** a real CourtListener token belongs only in the local
`~/.perch/mcp.json` on the owner's machine (he can mint his own with a
free CourtListener account), never in the committed copy. The old value
remains in git history, which is why the placeholder alone is not the
whole fix for a personal key — for this bundled one, removal plus
Perch-side rotation is the path, and the sweep's secret scan watches the
file.

**Verified:** the diff touches only the two token values (plus a final
newline); a scan of the edited file finds no remaining token-length
strings in the courtlistener block. No code, migration or behaviour
change, so typecheck/lint/tests are unaffected; CI runs them anyway.
