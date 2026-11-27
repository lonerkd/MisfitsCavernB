# 2026-11-26 — Studio header: one sticky unit + the picker's iOS zoom floor

From the owner's annotated screenshots (Nov 26, 2026): on his phone, in
portrait, the Studio tab pill rode up over the project picker. The header was
two independently sticky bars (the project bar at top: 0, the tab strip at
top: 58px) — two sticky offsets that can drift together in some scroll/zoom
states. The phone audit's Chromium shots do NOT reproduce it (bars stacked
cleanly), so this is a hardening, not a claimed root-cause fix:

- `page.tsx`: the `<header>` and the tab `<nav>` now render inside one
  `.stickyHead` wrapper; the wrapper is the only sticky element (top: 0).
  `.bar` and `.tabs` are static — the pair cannot overlap or separate.
- Phone (≤640px): the project picker's font goes 12px → 16px, iOS Safari's
  focus-zoom floor — a smaller font on a focusable control zooms the page on
  tap and breaks every sticky/100dvh measurement after it.
- New `studio-header.test.tsx` pins the structure (wrapper sticky, bars not,
  16px phone picker).

Verified locally: typecheck clean, the new tests 3/3, eslint clean on the
touched files. Not verified: the owner's iPhone — the audit's Chromium cannot
reproduce his overlap, so his phone after deploy is the proof.
