# Session — 2026-10-27: gated daily agent autopilot

**Why:** BACKLOG 3.34 calls for optional daily handoff after the owner has trusted an end-to-end worker trial.

**Added:** an opt-in scheduled workflow and a dry-run-by-default dispatcher that assigns the oldest eligible `agent-ready` backlog issue to Copilot. It stops at the configured active-issue or agent-PR limit. Updated `tools-and-access.md` §8 and BACKLOG 3.34 with the setup and remaining owner actions.

**Verification:** `npm run typecheck`, targeted ESLint, full `npm run lint`, the focused test (3/3), full `npm run test` (1,714 passed, 1 skipped), and `npm run build` passed. `sync-intel` produced no tracked changes; the new workflow YAML parsed.

**Not verified:** the GitHub workflow, token permissions, and Copilot assignment have not run against GitHub; the owner must complete a worker trial before enabling the autopilot.
