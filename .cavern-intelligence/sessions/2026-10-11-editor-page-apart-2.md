# Session — 2026-10-11: taking the editor page apart, part 2 (E1)

Second slice of E1 (see part 1, `2026-10-11-editor-page-apart-1.md`, and the
[plan](../plans/2026-10-11-editor-integration.md)). **Moves only.**
`app/(suite)/editor/page.tsx` 1,446 → 1,396 lines (1,610 at the start).

- `useScriptCasting` — who plays each character, the project's people to cast from, set/clear a casting.
- `useFindReplace` — the find & replace bar's state, count and replace one/all.

**Tested before trusting:** 11 unit tests (31 across the editor's hooks now) and a new e2e,
`editor-find-cast.spec.ts` (find & replace through the real editor, and casting a
character from the Character Bible, both saved). **It passes on the version of
the page from before this move as well as after** (run both ways).

**Found, not fixed (a product call):** find & replace *counts* matches ignoring case but *replaces* only
exact-case matches, so "Replaced 2 occurrences" can be reported when nothing changed.
Kept as it was in the move and pinned by a unit test marked `KNOWN QUIRK`; BACKLOG 3.19.

**Care taken:** the effect that listens for Ctrl+F now lists `setShowFindReplace`
(the setter now comes from a hook, so the linter asks for it; it is stable, so
when the effect runs is unchanged).

**Verified:** typecheck, eslint, `npm run test` (706), and on a build of this branch:
find-cast, undo, table-read, shot-designer, editor-project-script, split,
script-share, beat-to-script, studio-journey, accessibility (every page) — 13
e2e. **Not verified:** the other CI e2e shards; the co-writing/offline safety net
(#172, separate branch).

**Left in E1:** cut notes and split-screen following, opening/switching scripts
(the largest and riskiest — do it after #172 is merged so the safety net can run
against it), the write/format handlers, the writing loop.
