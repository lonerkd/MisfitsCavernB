# Session — 2026-10-27: search lives on the Caps Lock layer, not ⌘K

**Owner:** Caps Lock unlocks the layer of extra keyboard control (arrows,
numbers, letters, symbols); `/` there is search. Not ⌘K / Ctrl K.

**Changed:** the ⌘K / Ctrl K binding is removed from `CommandPalette.tsx`; the
island's search button reads "Search · Caps Lock, then /" (label and
`aria-label`), the shortcuts overlay no longer lists ⌘K, the e2e specs and the
shell bible follow. Caps Lock itself is unchanged (it already opens the deck,
and the deck already ignores keys while you type in a field).

**Left as is:** the palette still opens from the island button, the phone's
Everything sheet and Today's search button (the `mc-open-command-palette`
event), so touch users are unaffected.
