# Highlighted fields fit their frames — Nov 26, 2026

Owner's screenshot: in a Studio tool, the focused "Search this tool" field's
frame sat outside its pill — "some highlight fields don't fit their frames."

Two causes, both in the tool search (`.find` in ToolHeader, every Studio tool):
1. The global keyboard-focus ring is drawn on the INPUT (`input:focus-visible`,
   2px accent outline + 2px offset, !important) — a second frame around the
   field inside the pill, offset outside it. The pill already carries the focus
   state via `:focus-within`; the input's own ring is now suppressed inside
   `.find` only. Standalone fields keep their ring.
2. iOS draws a search field's own box at its intrinsic size, ignoring the
   frame it sits in. The input now has `appearance: none` (and a phone-scoped
   global rule does the same for every search field — crew, projects, boards,
   media), plus flexible sizing (`flex: 1 1 auto`, `max-width: 100%`,
   `min-width: 0`) and a `max-width: 100%` pill, so the field can never be
   wider than its frame.

Also in the owner's message: the Apple ∧/∨/✓ bar above the keyboard. That bar
is iOS's own form-navigation accessory, rendered by the OS in the installed
app — no web page can remove or restyle it. What the app can do is give him
its own bar (contextual quick answers above the keyboard); that is written
into the brief/guide redesign as the answer bar that lives with the tools.

Verified locally: typecheck clean, eslint clean, guard + toolFind +
ToolHeader suites 12/12.
