# Session — 2026-11-09: Go to and Compare versions reach main (took over PR #404)

PR #404 (Go to a scene, page or character; Alt-history; case/duplicate; Compare versions) was 75+ commits behind `main`. It is carried onto a clean branch: the pure modules (`goto`, `history`, `selection`, `version-diff`, `timing.lineAtPage`), the Compare versions modal, and the editor wiring. On top of `main`'s right-panel refactor the Revisions panel gets `onCompare`; the two new Alt chords are in the shared shortcut list (`lib/os/shortcuts.ts`) that the overlay and palette read. The modal's literal colours were moved to theme tokens (`color-mix` on `--ok`, `--danger`, `--warn`, `--fg`, `--bg`).

**Verified:** typecheck, lint on the touched folders (one pre-existing warning in `DiffModal`), full unit suite 307 files / 2644 tests. **Not verified:** in a browser (jump positions, two-column layout).
