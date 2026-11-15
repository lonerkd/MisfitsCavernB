# Session - 2026-11-15: Final Draft export is offered only where it is true (BACKLOG 3.22)

**The gap:** the editor offered .FDX for podcast, ad-copy, video, prose, game and outline scripts, though Final Draft has no elements for them and the file came out as screenplay elements.

**Built (no migration):** `exportChoicesFor(format)` in `lib/scriptos/export.ts`; the editor's export menu and the phone More sheet list it (non-screenplay formats: PDF, text, Fountain as written). Unit test.

**Not done:** a look at the rendered document PDF; guide workflows for the new project types.
