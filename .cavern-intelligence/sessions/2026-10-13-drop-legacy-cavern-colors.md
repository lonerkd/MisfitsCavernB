# Session — 2026-10-13: the unused `cavern-*` Tailwind colours are gone

**Found:** `tailwind.config.js` still defined `cavern-bg/fg/accent/muted/border` (`#080808`, `#ff3c00`…), values that differ from the real tokens. A grep of the repo found no class using them.

**Changed:** removed the `colors` block; `design-tokens.md` now says there are no Tailwind colours and points to the CSS variables.

**Verified:** typecheck, lint (0 errors), `npm run build`. **Not verified:** CI, e2e.
