# Session — 2026-10-13: design-tokens.md can no longer drift from the default theme

**Found:** the doc gave body text as vanilla `#e0ddae` and borders/dim text with older opacities; the shipped default uses cool white `#e9ebef` (`#e0ddae` is `--cream`).

**Changed:** the Foreground and Borders tables now match `globals.css`; new `lib/themes/tokensDoc.test.ts` reads both files and fails if the surface, text, accent or secondary colours, or the text and border opacities, differ. It failed on the old doc (`--fg` and the opacities), passes now.

**Not done:** only the default theme's tables are checked; the module colours and the other eleven themes are not (BACKLOG-level follow-up: generate the doc instead of checking it).

**Verified:** `lib/themes` tests 47/47, typecheck, lint (0 errors). **Not verified:** build, CI.
