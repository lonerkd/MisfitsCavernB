# Session — 2026-10-27: Compare versions — any two drafts, scene by scene

The third-ranked wishlist item ("what a writer needs the day they get notes"),
started properly rather than as polish. Before this, the editor could only diff
one locked revision against the text in hand, as a flat wall of lines.

**What it does now.** The Revisions panel has **Compare**. Pick *From* and *To*
from any locked revision or the current draft, and the modal shows:

- a summary: `+added` / `−removed` lines across both versions;
- **only the scenes that moved**, each badged Added / Cut / Changed with its own
  line counts, in the later version's order (a cut scene sits where it used to);
- click a scene to open its before/after, added lines green, removed red and
  struck through;
- "Show every scene" to include the unchanged ones, and "No changes between …"
  when the versions match.

**How it is built.** `lib/scriptos/version-diff.ts` splits both versions with
the real parser, pairs the scenes by heading through an LCS (so a scene that
moved or had lines inserted around it stays the same scene, and a renamed
heading reads as one out and one in), and counts the lines added and removed per
scene with `diff`. `components/editor/CompareVersions.tsx` is the modal; the
editor loads it lazily like the diff.

**Verified:** `npx tsc --noEmit` clean; `npx eslint` clean on every touched file;
`version-diff.test.ts` 8 tests and `CompareVersions.test.tsx` 4 jsdom tests
green; full unit suite and `npm run build` re-run before the push.

**Not verified:** looking at it in a browser (no local stack here) — the layout,
the scene expanding and the select round-trip are covered by jsdom only. Worth
two minutes on the next app run: lock a revision, edit two scenes, Compare.

**Next:** BACKLOG 3.35 — side by side, word-level inside a line, next/previous
change, filters, an imported script as a side, and aligning characters so a
renamed character reads as renamed. Then 4.12's slices 2 (review mode) and 3
(change report); review mode writes a new revision, so it is the natural next
feature-sized step.
