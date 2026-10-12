# Session — 2026-10-12: the deep brain, rung B2 — Fountain, complete and as written

Third rung of [the deep-brain plan](../plans/2026-10-12-the-deep-brain.md): the exact layer (L0).
First rung that changes product code; each change flips tests pinned earlier as known gaps.

**Changed:**
- **A `.fountain` file is imported as written** (`lib/scriptos/import.ts`). It used to be
  rewritten to plain text first, which dropped forced scene headings (`.SNIPER SCOPE`
  became action), the title page, sections, synopses and boneyard, and upper-cased
  `@mc`. Now only the line endings are made uniform. Plain text is still tidied; Final
  Draft is still converted.
- **The title page is a title page** (`lib/scriptos/parser.ts`): the leading block of
  known `Key:` lines (Title, Credit, Author, Source, Notes, Draft date, Contact,
  Copyright …) and the indented lines under them, up to the first blank line, are typed
  `title`, not `action`. Only at the very top, only with a known first key — `FADE IN:`
  and a `Notes:` line later in the script are untouched.
- **Dual dialogue as Fountain writes it** — a caret after the second name (`STEEL ^`) —
  marks both speeches (across the blank line between them), the cue's name is read
  without the caret in the cast and the scene. The older lone-`^` and leading-`^` forms
  still work.

**Flipped:** five expected-failure tests became ordinary tests (four import gaps and the
trailing-caret one). 16 new tests in `fountain-b2.test.ts`. The corpus floors held (the
text matrix does not use Fountain-only syntax).

**Found on the way:** the older keyword heuristic still types `Written by someone` (or any
early line containing "draft") as a title page, so `A cold draft…` is still wrong —
unchanged, and still pinned (BACKLOG 3.20 #3, B3).

**Verified:** `npm run test` (775 + 15 expected failures), eslint, typecheck.
**Not verified:** CI; the editor's import path with a real `.fountain` file in the browser
(the importer is unit-tested; the file picker is unchanged).

**Left in B2:** the Fountain spec's own example suite as a conformance test, and
round-trip as a property over generated scripts.
