# Session - 2026-11-21: settle a doubtful line in one tap (BACKLOG 3.21, B9)

The audit of 3.21 found its "left" list stale: line overrides (*Force type*) and the doubtful-reads panel already exist. What the panel lacked was a way to act on a doubt other than a name's project-wide verdict. Now a doubt whose reader-offered alternative is not "a character" has **Read as <alternative>** (for example a block the reader read as dialogue that might be action): it saves the same line override as Force type, for this script only, hides the doubt, and never touches the script's text.

**Known limit (unchanged, now said):** an override is by line number, so it does not follow its line when lines above are added or removed.
**Scope decision:** the reader's tuning is at diminishing returns (3.21's own measure), so I built the next product rung that was real and small rather than another weight. The larger rungs (the previous draft as evidence, per-writer memory, confidence in the Studio and the importers) stay open.

**Verified:** typecheck, eslint, unit tests (3) and `e2e/doubt-override.spec.ts` (the Script tab shows the doubt, the tap saves `reading_line_overrides`, the script text is unchanged, a reload keeps it and the doubt stays gone) on a production build on the local stack. **Not verified:** a phone; by eye.
