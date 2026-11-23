# Session - 2026-11-22: The island's context pill is a moment, not a place

The expanded pill ("Studio · Tab Library") stayed up for as long as the pointer rested on a tab, duplicating the top bar. The context shape now expands when the place or the thing under the pointer changes (`lib/island/transientContext.ts`: `useTransientContext`, 2.8 s) and goes back to rest on its own; it holds while the island itself is engaged (pointer or focus on it, a menu open, pinned) and counts again afterwards; Escape puts it away at once; a new context (another tab, another route) shows it again. The change is still announced to screen readers by a polite status region that outlives the shape. `islandMode` and the phone's one-popover logic (`lib/island/popover.ts`) are untouched; the shapes' CSS transitions already sit behind `prefers-reduced-motion`.

Not done: a route change with nothing under the pointer shows nothing (context needs a zone); that is unchanged.
