# Session — 2026-10-12: the deep brain, rung B1 — hard to fool

Second rung of [the deep-brain plan](../plans/2026-10-12-the-deep-brain.md): the measure
from B0 is only as good as it is hard to game. Stacked on B0 (#177).

**Built** (`lib/scriptos/corpus/`):
- `metamorphic.ts` — six equivalent rewrites (CRLF, trailing spaces, indentation,
  doubled blank lines, no final newline, leading blanks) and a stability score:
  the share of elements whose type is unchanged.
- PDF layout variants: `renderPdfPages` takes a sideways `shift` (margins, page
  size) and a `scale` (font size); `measurePdf` passes them through.
- `private.test.ts` — the owner's real scripts from a git-ignored `.private-corpus/`:
  lossless, stable under the rewrites, and a line-by-line diff against a saved
  snapshot of how every line is read (`BRAIN_UPDATE=1` accepts it). Skipped when
  the folder is absent, so CI is unaffected. Needs no labels.
- `robustness.test.ts` — the ratchet for both: stability floors are all 1;
  layout floors measured on the realistic-traps style.

**Found:**
- The parser is **perfectly stable** under every rewrite (1.000, all styles) — a
  strength, now locked in.
- The PDF reader's score is flat (0.480) from a 1 in to a 2 in margin and from
  0.85× to 1.2× scale, because structure loss dominates; the one cliff is a ~0.5 in
  left margin (0.305), where its fixed x-range stops seeing cues. Layout becomes
  the bottleneck only after the structure is fixed (B6).

**Verified:** 53 tests in the corpus folder; eslint and typecheck; the private runner
tried three ways (probe script passes, a corrupted snapshot is caught with the
changed line named, `BRAIN_UPDATE=1` accepts, and no folder skips cleanly).
**Not verified:** CI; any real script (none supplied yet).

**Owner:** put your own scripts (`.fountain` or `.txt`) in `.private-corpus/`
(never committed) — they turn "stable" and "unchanged" into claims about *your* work.

**Next:** B2 (Fountain complete; import as-is) and B3 (the evidence layer), which
already have named failing cases (BACKLOG 3.20).
