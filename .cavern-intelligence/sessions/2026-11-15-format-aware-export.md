# Session - 2026-11-15: text and Fountain export respect the script's format (BACKLOG 3.22)

**The gap:** the Fountain download re-emitted every script through the screenplay serializer, so a podcast, ad-copy, video, prose, game or outline script had its section lines turned into scene headings.

**Built (no migration):** `reemitsAsFountain(format)` in `lib/scriptos/export.ts`; only screenplay-read formats are re-emitted, every other format downloads as the author's source verbatim. Unit test `export-format.test.ts`.

**Not done (S–M each):** PDF and FDX for the non-screenplay formats still use screenplay layout (a podcast PDF wants a two-column or speaker layout; FDX has no element for these), so they are screenplay-shaped; a guide workflow for each new project type.
