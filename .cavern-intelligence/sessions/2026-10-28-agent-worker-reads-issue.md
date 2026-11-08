# Session — 2026-10-28: the Claude issue worker could not read its issue

The owner's `CLAUDE_CODE_OAUTH_TOKEN` was first rejected (runs died in 0.3 s with no usage); after a fresh `claude setup-token` the worker authenticated, but the run on test issue #326 ended after two turns with one permission denial: the prompt names only the issue number and `gh issue view` was not on the allow-list. The job also never installed dependencies, so the typecheck, lint and test commands it is told to run could not have worked.

**Fixed** in `.github/workflows/agent-claude.yml`: `Bash(gh issue view:*)` added to the allowed tools, and `actions/setup-node` plus `npm ci` run before the worker (the same setup as CI). Still never merges and never pushes to `main`.

**Verified:** re-labelling #326 `agent-ready` after the merge (result recorded in the PR).
