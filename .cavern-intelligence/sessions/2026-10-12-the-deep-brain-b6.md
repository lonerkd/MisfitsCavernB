# Session — 2026-10-12: the deep brain, rung B6 — the PDF reader rebuilt

Fifth rung of [the deep-brain plan](../plans/2026-10-12-the-deep-brain.md). Stacked on B3 (#181).

**Why:** `pdfImport.ts` was the old import modal's stitcher, ported as it was: a cue was a
character class at x 180–350, vertical gaps were ignored, parentheticals glued onto dialogue.
On the corpus it read 0.43–0.58 and lost a quarter of the cast.

**Built** (`lib/scriptos/pdfLayout.ts`, called by `pdfImport.extractTextFromPdf`):
- Items on one row become a line; a scene number standing apart in either margin is lifted
  out (and kept as Fountain's own `#12#`).
- The document's **own columns** are found from where lines start (nothing knows a coordinate),
  and each column's role — action, dialogue, parenthetical, cue, transition — is decided from
  what is in it (headings, `(…)`, short name-like lines, running prose), with page furniture
  excluded from that evidence.
- Lines become elements by **vertical gap** (a blank line is two font-heights), so separate
  paragraphs stay separate; wrapped dialogue joins; words hyphenated across a line break rejoin.
- Page furniture is dropped by what it says and where it sits; `(MORE)` lets a speech continue
  across the page.
- Output is plain structured text: a cue with its speech directly under it, a blank line
  between elements. The editor no longer runs the plain-text normaliser over a PDF (it re-blocked
  with its own classifier, and measured worse), and says so when a PDF has no text (a scan).

**Measured** (PDF path, macro-F1, before → after): PLAIN 0.574 → 0.948, REAL_WORLD 0.480 →
0.922, INTERNATIONAL 0.433 → 0.927; the ~0.5 in-margin cliff (0.305) is gone, every margin and
scale reads 0.91+. Scenes exact 100% and cast 100% in every PDF cell. The PDF path is now within
a hair of typed text, so what limits it is the parser (B5), not the reader. All PDF and layout
floors raised.

**Tests:** four `it.fails` PDF gaps became `it`; `pdf-layout.test.ts` (11) covers any margin or
size reading the same, furniture, scene numbers, `(MORE)`, hyphenated/accented/extension cues,
CJK, tiny and empty documents. Small pages exposed three real weaknesses, fixed rather than
worked around: line height from the font size not the gaps, furniture excluded from the column
evidence, prose evidence that works without lower-case.

**Left:** shouted dialogue after a cue (parser, B5). **Not verified:** a real PDF — only
synthetic pages at standard layout; pdf.js's own item splitting, rotated pages, two-column
(dual-dialogue) layouts, and scanned PDFs (reported as "no text", not OCR'd) are untested. Send a
real script PDF and I will measure it. Also CI.
