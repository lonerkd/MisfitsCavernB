# Claude Code — Misfits Cavern

Read `AGENTS.md` first — all universal rules and conventions live there.

## MCP Servers

Configured in `.claude/settings.local.json`:
- Supabase (schema, SQL queries, RLS verification)
- Vercel (deploy status, preview URLs)
- Playwright (e2e test execution)

## Skills

Locked skills for PostgreSQL + Supabase best practices:
- `supabase` — database design, auth, realtime, storage
- `supabase-postgres-best-practices` — indexing, RLS performance, migrations

## Session Start

1. Read `AGENTS.md` for project rules
2. Read `.cavern-intelligence/STATE.md` for current iteration
3. Run `npm run sync-intel` if manifest is stale
4. Read relevant source files for the task
