# Claude Code — Misfits Cavern

Read `AGENTS.md` first — all universal rules and conventions live there.

## Access & Autonomy

Harness access is configured in `.claude/settings.json` (committed, team-wide) so
it survives ephemeral/remote containers:

- **MCP servers** — Supabase (schema, SQL, RLS verification), Vercel (deploy
  status, build/runtime logs), GitHub (PRs, CI, issues), Google Drive, Indeed.
  Auto-approved via `enableAllProjectMcpServers`.
- **Permissions** — safe dev/verify/git/read-MCP operations run without prompting
  (`allow`). Destructive backend/deploy/merge ops still prompt (`ask`):
  Supabase `apply_migration`/branch mutations, `deploy_to_vercel`,
  `merge_pull_request`. Pushing to `main`, reading `.env*`, and `sudo`/`rm -rf`
  are blocked (`deny`). Feature work pushes to `claude/*` branches only.
- **SessionStart hook** — `.claude/hooks/session-bootstrap.sh` injects `AGENTS.md`
  + `STATE.md` into context at the start of every session.

To widen autonomy (e.g. auto-apply migrations), move rules from `ask` to `allow`.

## Skills

Locked skills for PostgreSQL + Supabase best practices (`skills-lock.json`):
- `supabase` — database design, auth, realtime, storage
- `supabase-postgres-best-practices` — indexing, RLS performance, migrations

## Session Start

1. Read `AGENTS.md` for project rules
2. Read `.cavern-intelligence/STATE.md` for current iteration
3. Run `npm run sync-intel` if manifest is stale
4. Read relevant source files for the task
