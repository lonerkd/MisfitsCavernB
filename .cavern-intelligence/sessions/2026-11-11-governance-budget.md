# Session - 2026-11-11: the governance gets a budget, and a cheaper CI for governance PRs

**Built:** `RULES.md` gains two non-negotiables — **"The free tiers are the
budget"** (Vercel Hobby 10 GB / 100 deployments a day, Supabase free, Actions
minutes; every push is a preview deployment and every PR is CI, so batch commits
and do not add a workflow, job, shard or dependency without removing one) and
**"The governance is part of the system"** (the rules, checks, hooks and agent
workflows are iterated, not furniture; improve them in the same PR and say why).
`ci.yml` now treats the agent-governance workflows (`gate`, `pr-risk`,
`pr-title`, `claude-review`, `agent-*`, `release`, `sbom`, `secret-scan`) as
prose, so a governance-only PR skips typecheck / tests / build / budget and costs
minutes instead of about five.

**Why:** the 2026-11-09 Vercel pause showed the budget is the real constraint.
The governance should spend it deliberately, and the owner asked for the rules,
checks and workflows to be iterated continuously for this setup and budget.

**Left:** the nightly `e2e-scheduled` could skip when `main` has not changed
since the last run; a Vercel usage watch (needs a `VERCEL_TOKEN` secret) would
catch the next limit before it pauses the project.
