# Session — 2026-11-16: the format classifiers' confidences, named (BACKLOG 3.21)

A pure refactor. The 30 per-branch confidence literals in `analyzeNonScreenplayLine` (the podcast, video-script, game-script, prose, documentary-outline and treatment classifiers, 50 to 95) moved from `lib/scriptos/parser.ts` into `lib/scriptos/thresholds.ts` as named constants (`podcastSpeakerConfidence`, `videoSectionMarkerConfidence`, `gameChoiceConfidence`, `proseHeadingConfidence`, `outlineBeatConfidence`, `treatmentProseConfidence`, and so on), each with a line saying what it decides. `parser-reference.md` is regenerated and lists them. Only numbers moved; no regex or branch order was touched.

**Proof of identical behaviour.**
- The corpus matrix (`BRAIN_REPORT=1 vitest run lib/scriptos/corpus`) is the same before and after, line for line.
- A throwaway test (not committed) hashed `parseScript` output (line ids removed, since they are time-based) for all 10 formats, with the decoder on and off, over 51 texts (a hand-made sample hitting every branch, forwards, spaced and reversed, plus 48 generated scripts), together with `normalizeScreenplay` of each: 1,020 parses and 51 normalisations, one SHA-256 (`aa5bc99e...367eb`) identical before and after.

**Left (in BACKLOG 3.21):** 14 confidence literals still inline in `parser.ts` (the Fountain pre-classifier and the screenplay path), and the inline patterns.
