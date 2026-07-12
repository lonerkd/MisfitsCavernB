# Tools & Access — Misfits Cavern

Everything an AI agent can reach in this repo, and how it's wired. This is the
single source of truth for **capabilities**; `.claude/settings.json` is the
machine-readable enforcement of it.

---

## 1. Adapter files (how each AI enters the repo)

Every tool reads one entry file, which points at `AGENTS.md` (universal rules)
and this `.cavern-intelligence/` hub (deep knowledge). No instruction is
duplicated — adapters are thin pointers.

| AI tool | Entry file | Then reads |
|---|---|---|
| **Claude Code** | `CLAUDE.md` | `AGENTS.md` + `.cavern-intelligence/` |
| **GitHub Copilot** | `.github/copilot-instructions.md` | `AGENTS.md` |
| Cursor / Windsurf / Cline / Zed / Codex / Gemini | `AGENTS.md` (native) | `.cavern-intelligence/` |

Start-of-session routing: **`INDEX.md`** (this directory) is the front door —
it lists every knowledge file and when to read it.

---

## 2. MCP servers (Claude Code)

Configured team-wide and auto-approved via `enableAllProjectMcpServers` in
`.claude/settings.json`. All five connect at session start.

| Server | Use it for | Live target |
|---|---|---|
| **Supabase** | schema (`list_tables`), SQL (`execute_sql`), RLS/persona verification, advisors, logs, migrations, generated types | project `fxsryglwpwcqkfjljbrm` ("The Cavern"), Postgres 17 |
| **Vercel** | deploy status, build logs, runtime logs/errors, deploys | project `misfits-cavern-b` (team `peters-projects-4575517e`) |
| **GitHub** | PRs, CI checks, issues, code search, reviews | `lonerkd/MisfitsCavernB` |
| **Google Drive** | read reference docs, briefs, assets | user Drive |
| **Indeed** | jobs-board reference data | — |

---

## 3. Permission model (autonomy vs. guardrails)

`.claude/settings.json` splits every tool into three buckets. Widen or narrow by
moving rules between `allow` / `ask` / `deny`.

**`allow` — runs without prompting** (safe, high-frequency):
- Dev/verify: `npm run *`, `npx tsc`, `npx playwright`, `npx vitest`, `npx eslint`
- Git: read/normal ops + push to `claude/*` branches
- File ops: `Read` / `Edit` / `Write` / `Grep` / `Glob`, `WebFetch` / `WebSearch`
- Supabase: all read tools **plus `execute_sql` and `apply_migration`**
- Vercel: read tools **plus `deploy_to_vercel`**
- GitHub: read tools + PR/branch/comment writes (create PR, push_files, reviews)

**`ask` — prompts first** (consequential but expected):
- `git push*` to non-`claude/*`, Supabase branch mutations / `create_project` /
  `pause`/`restore` / `deploy_edge_function`, `merge_pull_request`,
  `enable_pr_auto_merge`, `delete_file`, Drive writes

**`deny` — blocked outright**:
- Push to `main`, read `.env*`, `sudo`, `rm -rf /`

> Migrations and Vercel deploys are in **`allow`** — an agent can apply schema
> changes and ship to production without a prompt. The safety net is the
> branch→PR→persona-test workflow, not a permission wall. Keep migrations named
> and mirrored into `supabase-schema.sql` (see `database-and-security.md`).

---

## 4. Skills

Locked in `skills-lock.json`, symlinked into `.claude/skills/` (survives fresh
containers):

| Skill | Use for |
|---|---|
| `supabase` | database design, auth, realtime, storage, edge functions, RLS |
| `supabase-postgres-best-practices` | indexing, RLS performance, migration hygiene |

Claude Code also ships bundled skills usable here: `code-review`, `verify`,
`security-review`, `dataviz`, `update-config`. Invoke by name.

---

## 5. Session bootstrap hook

`.claude/hooks/session-bootstrap.sh` (wired as a `SessionStart` hook) injects
`AGENTS.md` + `STATE.md` into context at the start of **every** Claude Code
session, so continuity survives ephemeral/remote containers. Fails soft.

---

## 6. Environment variables

Client (safe, inlined into the browser bundle — `NEXT_PUBLIC_*`):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`,
`NEXT_PUBLIC_DISCORD_CLIENT_ID`.

Server-only (**never** `NEXT_PUBLIC_`): `SUPABASE_SERVICE_ROLE_KEY` — used by
`app/api/discord/notify` to read `discord_integrations.webhook_url` (a table
with no client-readable RLS policy by design).

CI (`.github/workflows/ci.yml`) needs `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` populated as Actions **secrets** (the anon key
is publishable, so a repo *variable* + `vars.` reference works too). The build
fails at `/api/discord/notify` if the anon key is blank.

Full template: `.env.example`. Reading `.env*` is `deny`-blocked for agents.
