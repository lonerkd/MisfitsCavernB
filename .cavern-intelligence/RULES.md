# The Cavern — Rules

**The one source of the working rules** for every agent and person, in every
session, local or cloud. Tool entry files (`CLAUDE.md`, `AGENTS.md`,
`.github/copilot-instructions.md`) are generated from or point to this file
by `npm run sync-intel` — edit here, never there (CI fails if they drift).

## What this is

**The Cavern** is a production suite for independent filmmakers — script,
pre-production, the shoot, post and release in one connected system, not
bolted-together tools. **Misfits Cavern** (with the s) is the company and
media brand that makes it. You are its lead engineer and QA: keep it real,
keep it cohesive, get it ready for paying users.

Stack: Next.js 16 App Router (React 19, webpack build) · TypeScript ·
Tailwind · framer-motion · Supabase (Postgres + RLS, Auth, Realtime,
Storage; production project `fxsryglwpwcqkfjljbrm`) · WebRTC · Vercel
(deploys `main` of `lonerkd/MisfitsCavernB`). Auth gating is `proxy.ts`.

## Start of every session

1. This file.
2. [`STATE.md`](STATE.md) — open work, known issues, the latest session
   (start at its "Resume here" if there is one).
3. [`BACKLOG.md`](BACKLOG.md) — every open task, scoped. Pick from it.
4. [`INDEX.md`](INDEX.md) — the map: where everything else is.

## Non-negotiables

1. **No mocks.** Every control the UI shows persists to real data and does
   the real thing. Cosmetic-only or half-built? Make it real or remove it.
2. **Verify, don't claim.** After a change: `npm run typecheck`, `npm run lint`,
   `npm run test`, `npm run build`. DB/RLS changes: a persona test in
   `tests/integration/` (owner ✅, crew scoped ✅, outsider ❌). Report what
   you ran and what it showed; say plainly what's unverified.
3. **One cohesive system.** Feedback through `useToast()`, confirmation
   through `useConfirm()` — never `alert`/`confirm`. Account preferences in
   the database; `localStorage` only for device-level things and caches.
   Every save checks its error and tells the person when it fails.
4. **Security floor.** RLS on every table from birth, through the `internal`
   helpers (`can_access_project`, `can_shape_project`, `can_access_script`,
   `can_view/post/manage_channel`); `(select auth.uid())` in policies; one
   SELECT policy per table; new `SECURITY DEFINER` functions go on the
   allowlist in `database-and-security.md` §2.D. A leak to an outsider is P0.
5. **Migrations are the schema.** `supabase/migrations/` only; never edit a
   merged one; snapshot, types and a persona test in the same PR; applied to
   production by hand after merge, then the drift check
   (`database-and-security.md` §3).
6. **Git.** Feature work on `claude/*` branches → PR → green CI → squash
   merge. Never push to `main`. Never rewrite history someone else depends on.
7. **Ask first** before anything destructive to live data, rotating keys,
   changing auth settings, or a design decision the owner hasn't made.
8. **Docs move with code.** A change to files, architecture or access
   updates the doc that owns it in the same PR, then `npm run sync-intel`,
   then `STATE.md` and `BACKLOG.md`.

## The change cycle

1. **Explore** — the files involved; the owning doc (see *Where to look*);
   `bible/inventory.md` for what a route touches.
2. **Check state** — `STATE.md`, `BACKLOG.md`.
3. **Plan** — exact files; RLS implications; who it affects (personas).
4. **Implement** — following `conventions.md` and `design-tokens.md`.
5. **Verify** — the commands above; for UI, look at it (`npm run dev`, or the
   `run-misfits-cavern` skill); for realtime, two sessions at once.
6. **Sync** — `npm run sync-intel`; STATE gets a new "Latest Session"
   (the previous one moves to `STATE-history.md`); BACKLOG gains what was
   found and not done (what, where, size, done-when) and loses what's done.
7. **Commit** — clear message, PR from the template, green CI before merge
   (`checks`, `database`, `e2e-local`, the Vercel preview).

Prioritise: broken > lying UI > missing-but-promised > polish. Reproduce a
bug before fixing it; prove the fix with the same reproduction.

## Personas

- **Sam** — project owner: creates, writes, schedules, hires, runs channels.
  Full rights on their projects.
- **Jordan** — co-writer / crew: co-edits live, posts where the channel
  allows, sees private channels only as a member; no destructive admin.
- **Riley** — outsider: sees nothing project-scoped — only links that were
  deliberately shared. Any leak to Riley is P0.

## Where to look

| Working on | Read |
|---|---|
| Any page | `bible/` (what it is, its states and rules) → `routing-and-surface.md` |
| UI | `design-tokens.md`, `conventions.md` §6, `components/ui/` |
| Database / RLS | `database-and-security.md` (§3 is the migration workflow) |
| ScriptOS | `scriptos-engine.md` |
| Studio | `studio-and-preproduction.md` |
| Lounge / voice | `lounge-and-audio.md` |
| The brief and phases | `project-brief.md`, `bible/11-rules.md` |
| Tools, MCP, permissions, skills, CI | `tools-and-access.md` |
| Brand | `brand/README.md` |
| The plan for the repo | `restructure-proposal.md` |

## Agent entry files

| Tool | Reads | What it is |
|---|---|---|
| Claude Code (local + cloud) | `CLAUDE.md` | `@`-imports this file and `STATE.md`, plus Claude-only notes |
| Codex, Cursor, Cline, Windsurf, Zed, Gemini, Jules, Copilot agent | `AGENTS.md` | a generated mirror of this file (some tools don't follow links) |
| GitHub Copilot (chat) | `.github/copilot-instructions.md` | a pointer here |

Skills (Claude): `.claude/skills/` — `run-misfits-cavern`, `supabase`,
`supabase-postgres-best-practices` (`tools-and-access.md` §4).
