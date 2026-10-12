# Session notes

One file per PR (or per stretch of work), newest first by name. This replaces
the "Latest Session" section that used to live in `STATE.md`, which every PR
edited at the same spot — so every merge conflicted. A new file never conflicts.

**Name:** `YYYY-MM-DD-short-slug.md` (the date sorts them; the slug is unique).

**Write:** what changed (and the PR), what you verified and how, what you did
*not* verify, what's next, anything the owner must do (a migration to apply,
a dashboard setting). Plain and short; link the owner doc instead of
restating it. Findings that need doing go in `BACKLOG.md`, not only here.

**Read:** `node scripts/latest-sessions.js [n]` prints the newest *n* (default
3). Claude Code runs it at session start (`.claude/settings.json`). Other tools:
open the newest files in this folder after `STATE.md`.

`STATE.md` stays the handoff: *Resume here*, *Direction*, *Open work*, *Known
issues*. Edit it only when that picture changes (a handoff, a decision, work
finished or opened) — not to log a PR.
