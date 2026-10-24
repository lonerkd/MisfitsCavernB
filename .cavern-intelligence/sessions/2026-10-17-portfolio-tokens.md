# Session — 2026-10-17: `/portfolio` video tile background is a token

**Changed:** `#0e0e0e` in `app/(suite)/portfolio/page.tsx` (tile background and the no-thumbnail placeholder) is now `var(--media-bg)`, defined once in `app/globals.css`. It is deliberately not a themed `--bg-n`: the tile carries a white play icon and a black scrim, which would fail contrast on the light themes (paper, editorial, lagoon). Dark in every theme; white on `#0e0e0e` is about 19:1. The gap is removed from `bible/07-network.md`; `design-tokens.md` names the token.

**Not changed:** other literal colours on the page (festival status colours, `#f59e0b` accents, `#060606`, the `#000` player frame) — outside this order; candidates for a follow-up.
