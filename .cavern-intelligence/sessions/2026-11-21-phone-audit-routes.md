# Session - 2026-11-21: the phone audit covers ten more surfaces (BACKLOG 3.41)

The mobile audit (iPhone 15 Pro, portrait and landscape, against the local stack) covered 19 routes. It now also covers Hub, Today, Cavern, Split, Showcase, Portfolios, Auth, a shared film page (the share page now carries the ask-to-be-credited button), and the Production tab's On set and Call sheets, so CI's `--check` holds them too (baseline: 58 route views).

**Result:** nothing to fix. The new findings are the audit's own limits: `/cavern` (a full-screen overlay sits over the pill and handle by design), `/portfolios` in landscape (the audit shrinks the screen after scrolling the field into view; iOS scrolls the focused field up), `/split` (a 0 px hidden label). Recorded in 3.41 so nobody re-chases them.

**What is left on 3.41 needs a real iPhone** (a pass in both orientations, the tab bar and thread panel with the real keyboard); a browser spec per surface is mostly covered by the audit itself now.

**Verified:** the audit run on a production build on the local stack (`--update`, then `--check` holds). **Not verified:** a real phone.
