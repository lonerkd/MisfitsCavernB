# 2026-11-26 — Game script: a format-shaped export and a build sheet (BACKLOG 3.51 gap 2, 3.22)

The last of the 3.51 format leftovers: the `game-script` format (in the registry since 2026-11-15) still
exported as a generic jsPDF document page, and its Export menu even offered Fountain — a screenplay
notation whose download was the raw source under a `.fountain` name. It now exports in its own shape,
following the video/prose pattern of the same day (`lib/scriptos/format-export.ts`):

- **`gameParts`** reads the script as the parser reads it: parts (ACT / LEVEL / QUEST / NODE …) and, in
  the order written, their beats — narration, `[bracketed]` cues, logic (`[IF …]`, `[SET …]`) kept
  exactly as written, spoken lines split into speaker and words, the player's choices (their marker
  stripped), and jumps (`-> label`) with the target as written.
- **Game PDF** (through the print kit): one table per part — Beat / Speaker / Text for every beat in
  order, so the branching reads as a game document, not a screenplay page — then a branch map, *Where
  the jumps go*. Facts: parts, dialogue lines, player choices, jumps. A cue's brackets are stripped in
  the print (the Beat column already says what it is); the logic keeps its own notation.
- **Build sheet** (Export › *Build sheet (.md)*): the handover to whoever builds the game, built only
  from the document — the structure (each part with its lines, choices and jumps counted), the cast
  with their line counts (the player counted by choices), the script part by part (lines with their
  speakers, consecutive choices grouped under *Player chooses:*, logic and cues verbatim), and every
  jump with the part it leaves from. It is a handover sheet, not a "publish package": a game script has
  no channel or CMS paste-target the way a video or an article does, so the menu names it honestly.
- The Export menu for a game script is now PDF / Build sheet / Text; the other formats' choices are
  unchanged (copy's pinned list untouched). The jsPDF document path still serves podcast, copy and
  outline PDFs.

Decisions: a jump's target is never resolved to a part — the format's parts carry no labels, so the
sheet lists the target exactly as written rather than guessing which node the writer meant. No AI and
no invented content anywhere, as with the video package.

Verified: tests first (16 new unit tests — `gameParts` / `gameScriptDoc` / `gameBuildSheet` in
`lib/scriptos/format-export.test.ts`, and the choice/label test in `export-format.test.ts` — seen
failing before the builders existed; 36/36 green in the two touched files); typecheck (app + e2e)
clean; lint 0 errors; build green; all 57 pages within the bundle budget. The full unit suite ran
3,727 passed with 7 failures, every one a 5-second timeout in four load-heavy files this change does
not touch (`scripts/vercel-ignore`, `lib/scriptos/corpus/previous`, `lib/scriptos/compare`'s 200 ms
timing test, `ScriptKnowledgePanel`) — the same files failed on unmodified `main` in a control run
the same hour (5 failures across two of them), and the same names timed out under load in #778's
session and passed on isolated re-runs there; the machine was running several sessions at once. The browser spec in
`e2e/format-publish.spec.ts` gains the build-sheet download through the Export menu; it is an opt-in
local-stack spec and this machine has no Docker, so its first run is the nightly e2e-local job — the
gap is the stack, not the flow. The print layout itself was not eyeballed in a browser in this session.

Left open (recorded in 3.51): a fuller guide workflow per format; carrying an ad or an article into a
production plan.
