# Session — 2026-11-04: shortcuts are searchable

The command palette (Ctrl/⌘ K) and the shortcuts panel (`?`) now find a keyboard shortcut by its keys or its name. One list, `lib/os/shortcuts.ts`, now feeds both: the Ctrl/⌘ chords are read from the table the handlers use (`lib/os/chords.ts`), the Caps Lock keys from the island's slot table (`lib/island/slots.ts`: Q creates, W jumps, E finds…), and the editor's own keys and the plot board are written there; the panel's hard-coded list is gone.

**In the palette:** type `ctrl z`, `cmd k`, `⌘z`, `caps q`, `undo` or `create` and the matching shortcuts appear under **Shortcuts** (up to six, with their keys); Enter opens the panel with what was typed already in its filter. **In the panel:** a filter box ("Find a shortcut by its keys or its name…"). Matching is by word: a longer word as the start of one (`und` finds Undo), a single character only as a whole word (`z` finds Ctrl Z, not Zoom); both spellings work on any machine (Ctrl Z and ⌘Z, "cmd" and "control").

**Verified:** `lib/os/shortcuts.test.ts` (every chord in the table is listed; keys, names, Caps Lock slots, empty and nonsense queries); `e2e/shortcut-search.spec.ts` in a real browser (the palette finds Undo by `ctrl z`, Enter opens the panel filtered, the panel's own filter finds the Create key and shows "no match"), plus the chords and keyboard-audit specs; typecheck, lint, the unit suite; looked at in the browser. No migration.

**Left (S):** a page's own island controls (what its Caps Lock keys do on that page) are not listed individually, because they come from the page at run time; the generated `island-coverage.md` has them per page. Selecting a shortcut in the palette opens the panel rather than running it.
