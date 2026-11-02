# Session — 2026-11-02: one table for the Ctrl/⌘ chords

First build step of the island's key model (global chords, hover context, Caps Lock suite layer). `lib/os/chords.ts` is the one table of Ctrl/⌘ chords: global ones mean the same in every tool, a tool's own are added on top and may not reuse a global one (`lib/os/chords.test.ts`). The editor's handler, the split view, the command palette and the shortcuts panel now read it, and the panel's Global and Editor groups are generated from it.

**Behaviour that changed:** ⌘K / Ctrl K now opens search everywhere — it was written down as the palette's key but was bound nowhere. ⌘/ / Ctrl / now opens the shortcuts panel everywhere (in the editor it used to open the editor's own copy). Nothing else moved: save, find, focus, go to, undo, redo and split behave as before.

**Verified:** unit tests for the table and matching; a real browser (`e2e/global-chords.spec.ts`: Ctrl K and Ctrl / on Today and inside the editor's text box); the existing editor undo, find/replace, safety-net and split specs still pass (8); typecheck, lint, unit suite. No migration.

**Left:** the suite-wide undo for non-text actions, keys shown beside every island action, and the Studio's and Lounge's own chords onto the table (BACKLOG 4.1, the key model in the island plan).
