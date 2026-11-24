# Session - 2026-11-23: an import says what the reader is unsure of (BACKLOG 3.21, B9)

The reader knew which lines it was unsure of, but only the editor's Doubtful reads panel showed them, so a person who imported a script heard "Imported" and found out later. Now the import toast says how many things the reader is unsure about and where to settle them (Doubtful reads in the Script tab); a clean script still says only "Imported". `lib/scriptos/import-report.ts` runs the same parse and `doubtfulReads` the editor uses and counts distinct doubts (a name is one, however many lines it heads). No migration, no change to the reader.

**Verified:** typecheck, lint, `import-report` unit tests (clean script none, a doubtful one counted, empty or odd text never throws, the message wording). The toast on a real import in a browser is not looked at.
