# Session — 2026-10-11: the old parser and import modal, compared

Owner supplied the old `ScriptParser.ts` ("Deep Brain 3.0") and the old import modal
to compare with today's `lib/scriptos/parser.ts` and `pdfImport.ts`/`import.ts`.
Compared by reading **and** by running: the old scene-heading and transition rules
were ported exactly and run on the same lines as the current parser; the current PDF
pipeline was run on a mocked US-Letter page at standard screenplay coordinates.

**Result:** 20 confirmed gaps, each pinned as an expected-failure test
(`parser-gaps.test.ts` 11 gaps + 4 guards, `import-gaps.test.ts` 9 gaps + 2 guards),
scoped in BACKLOG 3.20. No product code changed.

Most damaging: the PDF importer (a typed port of the old modal's stitcher, same
hard-coded coordinates) swallows `MARY-ANN`, `JOSÉ` and `FADE OUT.` into the lines
before them, glues parentheticals to dialogue and loses the dialogue of `LEO (O.S.)`.
Fountain import rewrites the file to plain text first, dropping forced headings,
title page, sections and synopses that the parser would have kept.

**Verified:** the two test files (6 guards pass, 20 expected failures), eslint, typecheck.
**Not done:** any fix; a corpus of real scripts to measure accuracy (the old parser
claimed "near-perfect accuracy across thousands of styles" with no corpus).
