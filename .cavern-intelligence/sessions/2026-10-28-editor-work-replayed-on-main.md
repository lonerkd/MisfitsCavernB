# Session — 2026-10-28: the editor navigation and version-compare work, replayed on main

**Why a replay.** The 2026-10-27 branch (`backup/editor-2026-10-27`) branched
from `main` at `3a9287e`. By the time it was ready, `main` was **75 commits
ahead** and had built its own foundations in the same places — one chord table
(`lib/os/chords.ts`, #394), island slots (#396), a shortcut overlay generated
from the chord table, `ShortcutsModal` deleted, `Ctrl Z` outside the editor
(#398), Paper as the default theme (#399). Merging the old branch would have
fought all of that, and would have re-introduced a duplicate shortcuts overlay.
So the work was replayed on top of `main` instead; the old branch is kept as
`backup/editor-2026-10-27` and nothing is lost.

**What main already had, and what this therefore does not carry:**
- Next 16.4.3 (main upgraded too — the old branch's bump was a duplicate).
- The festival-jsonb guard (`fix: validate festival submissions`, #317) — the
  old branch's `ed9d847` was a second fix for the same bug.
- Anything to do with `ShortcutsModal` — it no longer exists on main.

**What this branch carries (all new to main):**
- `lib/scriptos/sceneviews.ts` — `stepScene`, `sceneNumberFromInput`.
- `lib/scriptos/goto.ts` — what the Go to box resolves: a scene, a page
  (`p12`), a character (their next scene, cycling), `speakingCast`, `lineOffset`.
- `lib/scriptos/history.ts` — the in-session jump history (Alt + ← / →), 50 deep.
- `lib/scriptos/selection.ts` — case the selection, duplicate the line.
- `lib/scriptos/version-diff.ts` — the scene-aligned version comparison and the
  side-by-side row pairing (`summarizeVersions`, `inlineRows`, `changedRowIndexes`).
- `lib/scriptos/timing.ts` — `printedLineRuns` + `lineAtPage` (the page jump
  reads the same 55-line measure the page count uses).
- `components/editor/CompareVersions.tsx` — the Compare versions modal: any two
  of the locked revisions or the draft, Scenes or Side by side, next / previous.
- The editor page and `EditorSidePanels`: the Go to dialog wired to real jumps,
  Ctrl/⌘ + ↓ / ↑ through the chord table, Alt + ← / →, Alt + U / L / D / S,
  and the Revisions panel's **Compare** button.

**Verified:** `npx tsc --noEmit` clean; `npx eslint` clean on the editor, its
components and `lib/scriptos`; full unit suite **223 files / 2130 tests, 2
skipped**; `npm run build` exit 0.

**Not verified:** in a browser — there is no local stack here, so the jump
positions, the two-column layout and the selection restoring after Alt + U are
unit/jsdom-tested only. Worth two minutes on the next app run.

**For the next slice:** BACKLOG 4.7 records what is left of the editor's power
editing (block selection, snippet triggers — the latter needs a
`script_stash.trigger` column), and wishlist 4.12 what is left of compare
(filters, an imported script as a side, aligning characters so a rename reads
as a rename).
