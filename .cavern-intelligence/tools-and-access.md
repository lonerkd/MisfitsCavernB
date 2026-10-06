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
> branch→PR→persona-test workflow, not a permission wall. Migrations live in
> `supabase/migrations/` (see `database-and-security.md` §3).

---

## 4. Skills

Vendored as real folders in `.claude/skills/` (committed, so they survive
fresh containers and work on Windows, which checks symlinks out as text
files); `skills-lock.json` records each one's source and hash. Restored
2026-10-06 — a July clean-up (`65bb696`) had deleted the files and left the
links dangling. To refresh from upstream: `npx skills add supabase/agent-skills`,
then copy `.agents/skills/<name>` over `.claude/skills/<name>` and delete
`.agents/` (the installer writes symlinks).

| Skill | Use for |
|---|---|
| `run-misfits-cavern` | run, build, test and drive the suite locally (`driver.mjs`) |
| `supabase` | database design, auth, realtime, storage, edge functions, RLS |
| `supabase-postgres-best-practices` | indexing, RLS performance, migration hygiene |

Claude Code also ships bundled skills usable here: `code-review`, `verify`,
`security-review`, `dataviz`, `update-config`. Invoke by name.

---

## 5. Session bootstrap hook

`.claude/hooks/session-bootstrap.sh` (wired as a `SessionStart` hook) injects
`AGENTS.md` + `STATE.md` into context at the start of **every** Claude Code
session, so continuity survives ephemeral/remote containers. Fails soft. It
caps the injection at 12,000 characters and says so if STATE.md outgrows it
(it shouldn't: STATE holds only open work and the latest session; older
sessions go to `STATE-history.md`, open tasks to `BACKLOG.md`).

---

## 6. Environment variables

Client (safe, inlined into the browser bundle — `NEXT_PUBLIC_*`):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`,
`NEXT_PUBLIC_DISCORD_CLIENT_ID`.

Server-only (**never** `NEXT_PUBLIC_`): `SUPABASE_SERVICE_ROLE_KEY` — used by
`app/api/discord/notify` to read `discord_integrations.webhook_url` (a table
with no client-readable RLS policy by design).

CI (`.github/workflows/ci.yml`) reads `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` from Actions **variables** (`vars.*`) — they are
publishable; only `SUPABASE_SERVICE_ROLE_KEY` is a secret. Both Discord routes
construct their clients lazily *inside* the handler, so a missing key fails at
request time with a clean 500 rather than breaking `next build`.

Full template: `.env.example`. Reading `.env*` is `deny`-blocked for agents.

## 7. CI, checks and local tooling

What guards `main`, and the commands behind each guard:

| Guard | Where | Local command |
|---|---|---|
| Types, lint, unit tests, build | CI `checks` | `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` |
| Page weight (first-load JS per page, gzipped) | CI `checks` | `npm run budget` (after a build); `-- --update` rewrites `performance-budget.json` (+10%) — raise a number only on purpose |
| Schema = migrations; types = schema; persona tests | CI `database` | `npm run db:drift`, `npm run db:types:check`, `npm run test:integration` |
| Every e2e spec (the public smoke specs too) against a fresh local stack, in 5 parts balanced by time | CI `e2e-local` | `npm run stack:up [-- build]`, then `E2E_LOCAL_STACK=1 E2E_LIVE_AUTH=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test e2e/<spec>` |
| Production = committed schema | `production-drift.yml`: nightly and after schema changes land on main. Needs the `PRODUCTION_DB_URL` secret (a read-only role) and **fails without it** | `DRIFT_TARGET_DB_URL=… npm run db:drift -- --target` |

**The production drift login** (working since 2026-10-06). The workflow logs
in as `drift_reader` through the **session pooler** (GitHub's runners are
IPv4-only; the direct `db.<ref>.supabase.co` host is IPv6-only). The role has
no table grants beyond what `supabase/fingerprint.sql` reads:

- `USAGE` on schema `storage` and `SELECT` on `storage.buckets` (bucket
  settings — ids, public flag, limits; no files), plus `BYPASSRLS`, because
  `storage.buckets` has RLS with no policies. It can't read any other table,
  so the bypass reaches nothing else.
- `USAGE` on schema `extensions`, so column defaults print as
  `uuid_generate_v4()` like the snapshot, not `extensions.uuid_generate_v4()`
  (a schema without USAGE is skipped in the search_path). `db:drift` also
  sets Supabase's default search_path on every connection.

The secret is **`PRODUCTION_DB_URL`** — the full session-pooler string,
`postgresql://drift_reader.fxsryglwpwcqkfjljbrm:<password>@aws-0-us-west-2.pooler.supabase.com:5432/postgres`
(surrounding spaces are trimmed). The workflow also accepts just the password
as **`PRODUCTION_DB_PASSWORD`** (preferred when set; it builds the address).
Nobody needs to keep a copy of the password. To change it, or to rebuild the
role from scratch, in the Supabase SQL Editor:

```sql
-- new role only: CREATE ROLE drift_reader LOGIN;
ALTER ROLE drift_reader WITH LOGIN BYPASSRLS PASSWORD 'a passphrase you type';
GRANT USAGE ON SCHEMA storage, extensions TO drift_reader;
GRANT SELECT ON storage.buckets TO drift_reader;
```

then set `PRODUCTION_DB_PASSWORD` to the same passphrase (or rebuild the URL),
and run *Production schema drift* from the Actions tab. When it fails, its
annotation says why: a connection error with the target's shape (user, host,
password length — never its characters), or the differing schema lines. A
refused login also shows in the Supabase logs (`supavisor_logs`).

- `e2e-local` runs the whole `e2e/` folder; each spec skips itself unless its
  stack is there, so a new spec is in CI the moment it's added.
  `scripts/e2e-shard.mjs` deals the files across the 5 shards by
  `e2e/timings.json` (longest first onto the lightest shard; a spec with no
  timing counts as the median). Refresh the timings when files are added or
  get much slower: run the suite with `--reporter=json` into a file, then
  `node scripts/e2e-shard.mjs --update <file>`. One worker per shard — on 4
  CPUs, 3 workers ran no faster and timed out.
- **Docs-only PRs** (only `*.md`, `.cavern-intelligence/`, `docs/`) skip
  `database` and `e2e-local` (the `changes` job decides); `checks` still runs.
  Pushes to `main` always run everything.
- **What to run locally before pushing** (CI runs the rest in parallel,
  ~5 min): `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`,
  plus the e2e specs for the surfaces you changed (and `npm run
  test:integration` for schema/RLS work). Don't run the whole e2e suite
  locally — it's ~13 min on one worker, and CI runs it anyway.
- `e2e/layout.spec.ts` guards the desk layout (every app on the opened island
  visible; the Lounge composer and the editor footer above the island while the
  lists either side reach the foot of the screen; no sideways scroll).
  `e2e/island.spec.ts` walks the island's shapes (rest, open, pinned, a held
  menu, the dot while typing, the Caps Lock keys).
- `scripts/dev-stack.sh` assumes a Unix shell with a real `/tmp`; under Git Bash
  on Windows run its steps by hand (`npx supabase status -o json`, build with
  `NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY` from it, `npx next start -p 3000`).
- Git hooks (`.githooks/`, enabled by `npm install` via `prepare`): pre-commit
  lints staged files; pre-push runs types and unit tests.
- Node is pinned in `.nvmrc` (22) for CI and local; `engines` allows ≥20.
- Fonts are self-hosted in `app/fonts` (SIL OFL) — builds never fetch Google Fonts.
- Dependabot opens grouped weekly updates; CODEOWNERS asks the owner to review;
  the PR template carries the Database / Tests / checklist sections.
