# Session — 2026-11-09: the rest of the plan (the rail, the scene card, frosted mode's leftovers)

**Editor rail:** its collapsible section headers (`EditorSidePanels`) now speak the tool header's language at the rail's scale: a lit gradient surface, a hairline, an accent-tinted icon chip, the frost under the mode. They stay compact accordions; a full card header would have crowded a narrow column.

**Shared scene card: decided against.** The two scene "cards" are different things: the editor's is a dense drag-to-reorder list row over parsed script lines (with a keyboard-reorder flow the end-to-end tests cover), the Studio's is a database-backed workspace (references, shots, notes, colour). One component would couple the editor's reorder to Studio data. They share vocabulary and surface language, not code; the Studio card takes the frost.

**Frosted mode:** the global `.module-tile` and `.card` frost; `data-frost="off"` (a global rule that zeroes `--frost` and the blur inside) opts a view out, and the stripboard's board and the editor's writing column use it. I restored a unit test that an earlier edit had silently dropped (the inline-surface rules), now covering the global classes and the opt-out too.

**Looked at:** the nine themes not yet seen, frosted, as one contact sheet; the editor; the project page and `/split` on a 393 px phone. All read; nothing broke.

**Not verified:** the blur's cost on a real device; a CSS-module card with its own solid `--bg-2`.
