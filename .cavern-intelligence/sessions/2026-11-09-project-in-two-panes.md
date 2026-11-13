# Session — 2026-11-09: the project in two panes (slice 1)

Owner: every tool should be designed to the project page's level, and the split screen should be more automatic, with a dual page as the project's ideal state. Plan and the audit of what the project page does that the tools don't: [plans/2026-11-09-project-in-two-panes.md](../plans/2026-11-09-project-in-two-panes.md) (BACKLOG 3.47).

**Built:** a **Two panes** button on the project page (`projectPairSearch`: the project in one pane, the tool its phase works in beside it); a new split message `open-beside` so a toolkit tile or "Go" clicked in a pane opens in the *other* pane (only a safe path; linked or not; Ctrl/⌘/Shift-click still opens normally); smarter `companionOf` (project → script, breakdown ↔ schedule, readiness and On set → schedule, Sound → script).

**Verified:** typecheck, lint, `lib/split` unit tests (33). **Not verified:** in a browser; the whole design pass is the backlog entry, not done here.
