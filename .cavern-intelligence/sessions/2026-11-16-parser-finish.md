# Session - 2026-11-16: the last of the parser's confidences named (BACKLOG 3.21)

**Built:** the 14 `confidence` literals left in `lib/scriptos/parser.ts` (the Fountain pre-classifier and the screenplay path) are named constants in `lib/scriptos/thresholds.ts`, each with what it decides; `parser-reference.md` regenerated. No number that decides a reading is inline in the parser now.

**Proof it changed nothing:** a throwaway SHA-256 over `parseScript` (types, text, confidence) for 78 generated scripts (every corpus style, 6 seeds) in 10 formats, plus `normalizeScreenplay`, is identical before and after (`304bc716…71fa`); not committed. The `lib/scriptos` suite passes (555).

**Not done:** BACKLOG 3.38(5), the parse context's unread `places`: the agent started on it and hit the usage limit; left as it was.
