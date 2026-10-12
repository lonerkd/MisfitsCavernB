# Session — 2026-10-11: one note per PR, the manifest no longer committed

**Why:** every PR edited the same spot in `STATE.md` (the "Latest Session"
section) and regenerated `sync-manifest.json` (timestamps, mtimes), so every
merge of a stacked PR conflicted (seen on #165–#167). Neither conflict ever
protected accuracy — accuracy comes from the "docs move with code" rule.

**Changed:**
- `sessions/` — a note per PR (`YYYY-MM-DD-slug.md`); a new file never
  conflicts. `scripts/latest-sessions.js` prints the newest three; a
  `SessionStart` hook in `.claude/settings.json` runs it.
- `STATE.md` is the handoff only (Resume here, Direction, Open work, Known
  issues); its old "Latest Session" moved to `sessions/2026-10-11-rename-…`.
  13 KB → 6 KB.
- `sync-manifest.json` is gitignored (nothing read it; CI's `--check` covers
  the entry files only).
- `CLAUDE.md` now also imports `BACKLOG.md` and `INDEX.md`.
- RULES (rule 8, change cycle step 6), INDEX, tools-and-access and the PR
  template say the same.

**Verified:** `node scripts/sync-intel.js --check` passes; the hook command
prints the notes. **Not verified:** the hook firing in a fresh Claude Code
session (needs a restart); CI on this PR.

**Next:** the owner pastes migration `20261012010000` (see STATE → Resume here).
