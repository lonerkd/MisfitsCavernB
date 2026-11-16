# Session - 2026-11-16: the phone design pass, looked at in a browser (BACKLOG 3.41)

**What changed in how this was done:** the earlier fixes came from a screen recording and code reading. This time the app was built against the local stack and every main screen was photographed at 393x852 and 852x393 (Paper theme, a seeded account with four projects), then the fixes were photographed again beside the old shots.

**Found and fixed:**
- **The blank gaps** (between Settings' sections, above its first section, on the project page): a bare global `section { padding: 90px 18px }` in `globals.css`, left from the marketing page, put 90 px above and below every `<section>` that did not set its own padding. Removed; a unit test keeps a bare element rule out of `globals.css`.
- **The pill said the project twice in the Studio** ("Femme Fatale Femme Fatale"): the Studio's stage title was the project's name. It is "Studio" now (the Everything sheet reads "On this page · Studio").
- **The install hint was cut off** ("Add to Home Scree…"): it wraps now.
- **Neon green and hard-coded violet:** the crew "Open" outline and filter, and the profile's Open to work, used pure `#00ff00`; the Jobs buttons used `#7c3aed` / `#8b5cf6`. All are theme tokens (`--ok`, `--violet`).

**Seen, not fixed (design calls or larger):** in landscape the floating pill sits over the content with no space reserved, hiding text under it; the Lounge in landscape leaves two lines for messages and shows a dead composer when a channel is read-only (a one-line notice would do); the Studio's tab strip clips its last tabs with no hint that it scrolls; the Studio tiles carry unexplained dots; "Two panes" is offered on a phone where it only stacks; the project picker truncates a short name at 160 px; an unlabelled "Team" select tops the project page; a stray lock glyph sits outside the locked-tab cards; the portfolio hero heading clips a long name; React hydration error #418 appears on some pages (text differs between server and client: not yet traced). The editor's Board, Outline, Preview and Stats views were not photographed (the script's selector missed the view button).

**Verified:** unit tests (159 in the areas touched), typecheck, lint; the before and after shots of Settings, the project page, Studio overview and share, Jobs, Community, Lounge and the hub. Not looked at on a real iPhone.
