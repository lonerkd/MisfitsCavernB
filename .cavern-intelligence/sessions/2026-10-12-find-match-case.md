# Session — 2026-10-12: find & replace follows case (BACKLOG 3.19)

The editor's find bar counted matches ignoring case but replaced only exact-case ones, so "Replaced 2 occurrences" could show when nothing changed. Now there is a **Match case** toggle (`Aa`, on by default — MAYA and Maya differ in a screenplay) and the count, Replace and All all follow it. Nothing to replace says so instead of reporting success. A `$&` or `$1` in the replacement is now plain text (a function replacer).

**Verified:** hook unit tests (the pinned quirk became a test that the count is what is replaced, in both modes, plus the `$` case), typecheck, eslint, full unit run; the existing e2e (exact-case find → replace → all) is unchanged and still describes the default. **Not verified:** CI (billing); the e2e was not re-run here.
