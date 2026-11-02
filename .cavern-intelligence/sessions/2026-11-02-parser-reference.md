# Session — 2026-11-02: the parser reference, generated

The owner asked for "a whole bible of variables" for the parser. `.cavern-intelligence/parser-reference.md` is it: every `KNOWLEDGE` word list (scene prefixes, times of day, transitions, camera angles, extensions, the verb, sound, prop, wardrobe, vehicle and VFX lists), the heading vocabulary (times in six languages, filler, number words, months, weekdays), the patterns (frame tags, years, clock times, bare transitions, time cards), the language synonyms and verb phrase, and every decoder weight with what it prices.

**Generated, not written:** `lib/scriptos/reference.ts` builds it from the code; `npm run parser:reference` writes it; `lib/scriptos/reference.test.ts` fails when the committed file is stale, and fails when a decoder weight has no description in `PARAM_DOCS`, so the reference cannot fall behind the reader. The constants it reads are now exported (`heading.ts`, `languages.ts`, `parser.ts`, `decode.ts`); nothing else changed in the engine.

**Verified:** the two tests; typecheck; the corpus ratchet and the rest of the unit suite unchanged. **Not covered:** the evidence layer's and document profile's thresholds (they are inline numbers in functions, not named constants) — naming them so they can be listed is the next step.
