# Session - 2026-11-11: the rules merge, leaned down

**The poison:** a Claude Code session @-imported **102 KB** into context at
start — 83% of it the 84.6 KB `BACKLOG.md` (`CLAUDE.md` pulled RULES + STATE +
BACKLOG + INDEX). The token budget was going out the door before an agent wrote
a line. The PR-merge side (squash, branch protection, the gate) is sound; the
rules text is fine. The *merge* was the poison.

**Built:** `CLAUDE.md` now imports the rules and the small handoff docs (RULES,
STATE, INDEX — 17.6 KB) and is *pointed* at the BACKLOG ("read it when you pick
a task, not whole at the start"). `RULES.md`'s session-start says the same.
`sync-intel.js` generates it; the `--check` drift gate keeps it honest. Saves
about 85 KB of context per session.

**Verified:** `node scripts/sync-intel.js` regenerates all four entry files
(AGENTS.md, CLAUDE.md, copilot-instructions.md, PERCH.md); `--check` is clean.

**Left:** the BACKLOG itself is 84.6 KB — its detail belongs in the plan files
it links, and the list should be scannable. Slimming it is the next pass.
