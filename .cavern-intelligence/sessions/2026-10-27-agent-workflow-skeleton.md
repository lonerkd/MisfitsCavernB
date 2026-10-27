# Session — 2026-10-27: the GitHub agent workflow skeleton

**Why:** the owner's best 24/7 setup was a GitHub-native loop (issues, scheduled agents, PRs, human merge). The local daemon is gone and GitHub Models (the free model quota) was retired on 2026-07-30, so this rebuilds the loop's free parts and leaves the worker pluggable.

**Added:** `scripts/backlog-to-issues.mjs` (dry run by default), `scripts/agent-status.mjs` with `.github/workflows/agent-status.yml`, `.github/workflows/agent-claude.yml` (dormant without a secret), `tools-and-access.md` §8, BACKLOG 3.34. Also renumbered the CRDT backlog entry from a duplicate 3.32 to 3.33.

**Verified:** both workflows parse as YAML; both scripts pass eslint; the backlog script's dry run lists 17 items; the status script's report renders against live data.

**Not verified:** the Claude workflow has never run (it needs the owner's app install and token); the status workflow has not run on GitHub yet.
