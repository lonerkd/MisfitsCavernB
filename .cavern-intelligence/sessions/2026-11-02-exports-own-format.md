# Session — 2026-11-02: exports read a script with its own format

The follow-up to the script-formats work: the text, Fountain, FDX and PDF exports parsed the script as a screenplay whatever its format. They now read with `readingFormat(script.format)`, the same rule as the editor and the Studio. The visible difference is small and honest: a podcast script's Fountain export is its text as written, where reading it as a screenplay forced its segment header with a `!` (`!COLD OPEN`).

**Verified:** `export.format.test.ts` (the Fountain export of a podcast script equals the text; read as a screenplay it gains the `!`); typecheck, lint, unit tests, build. **Not verified:** FDX and PDF output for a podcast or outline script was not opened in Final Draft or a PDF viewer, only the shared reading changed.

**Left (BACKLOG 3.22 b):** the public share page (the `get_shared_script` RPC does not return the format, so it needs a migration), the pitch deck's script scan, Spotify mood, and Normalize (canonical Fountain is a screenplay notion; left on purpose). Housekeeping in the same PR: a duplicated line in the previous note and a stale "belongs to 3.35" in BACKLOG 3.21.
